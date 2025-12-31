const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Driver = require('../models/Driver');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { isOperationsOrAdmin, isSalesAgent, requireRole } = require('../middleware/rbac');
const { upload, handleUploadError } = require('../middleware/upload');

// @route   POST /api/documents/:driverId
// @desc    Upload document for driver
// @access  Sales Agent, Admin
router.post('/:driverId',
    auth,
    isSalesAgent,
    upload.single('file'),
    handleUploadError,
    async (req, res) => {
        try {
            const { driverId } = req.params;
            const { type, documentNumber, expiryDate } = req.body;

            // Verify driver exists and belongs to agent
            const driver = await Driver.findById(driverId);

            if (!driver) {
                return res.status(404).json({
                    success: false,
                    message: 'Driver not found'
                });
            }

            // Sales agents can only upload for their own drivers
            if (req.user.role === 'sales_agent' &&
                driver.registeredBy.toString() !== req.userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'Please upload a file'
                });
            }

            // Create document record
            const document = await Document.create({
                driver: driverId,
                type,
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                path: req.file.path,
                documentNumber,
                expiryDate: expiryDate ? new Date(expiryDate) : undefined,
                uploadedBy: req.userId,
                status: 'pending'
            });

            // Check if all required documents are uploaded
            const requiredDocs = ['license', 'insurance', 'vehicle_registration', 'photo'];
            const uploadedDocs = await Document.find({ driver: driverId }).distinct('type');
            const allDocsUploaded = requiredDocs.every(doc => uploadedDocs.includes(doc));

            if (allDocsUploaded) {
                driver.documentsComplete = true;
                await driver.save();
            }

            // Audit log
            await AuditLog.log({
                action: 'create',
                entityType: 'document',
                entityId: document._id,
                description: `Uploaded ${type} document for driver: ${driver.fullName}`,
                performedBy: req.userId,
                performedByName: req.user.name,
                performedByRole: req.user.role,
                ipAddress: req.ip
            });

            res.status(201).json({
                success: true,
                data: document
            });

        } catch (error) {
            console.error('Upload document error:', error);
            res.status(500).json({
                success: false,
                message: 'Error uploading document'
            });
        }
    }
);

// @route   GET /api/documents/queue
// @desc    Get document approval queue
// @access  Operations, Admin
router.get('/queue', auth, isOperationsOrAdmin, async (req, res) => {
    try {
        const { status = 'pending', type, page = 1, limit = 20 } = req.query;

        let query = {};

        if (status !== 'all') {
            query.status = status;
        }

        if (type) {
            query.type = type;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [documents, total] = await Promise.all([
            Document.find(query)
                .populate('driver', 'personalInfo vehicleInfo status')
                .populate('uploadedBy', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Document.countDocuments(query)
        ]);

        // Get counts by status
        const statusCounts = await Document.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const counts = { pending: 0, approved: 0, rejected: 0 };
        statusCounts.forEach(s => { counts[s._id] = s.count; });

        res.json({
            success: true,
            data: documents,
            counts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get queue error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching queue'
        });
    }
});

// @route   GET /api/documents/:id/file
// @desc    Get document file
// @access  Private
router.get('/:id/file', auth, async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('driver', 'registeredBy');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Sales agents can only view their own drivers' documents
        if (req.user.role === 'sales_agent' &&
            document.driver.registeredBy.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Check if file exists
        if (!fs.existsSync(document.path)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        res.sendFile(path.resolve(document.path));

    } catch (error) {
        console.error('Get file error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving file'
        });
    }
});

// @route   PUT /api/documents/:id/status
// @desc    Approve or reject document
// @access  Operations, Admin
router.put('/:id/status', auth, isOperationsOrAdmin, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Status must be approved or rejected'
            });
        }

        if (status === 'rejected' && !rejectionReason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const document = await Document.findById(req.params.id)
            .populate('driver');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        const previousStatus = document.status;

        document.status = status;
        document.reviewedBy = req.userId;
        document.reviewedAt = new Date();

        if (status === 'rejected') {
            document.rejectionReason = rejectionReason;
        } else {
            document.rejectionReason = undefined;
        }

        await document.save();

        // Check if all documents for driver are approved
        if (status === 'approved') {
            const driverDocs = await Document.find({ driver: document.driver._id });
            const allApproved = driverDocs.every(d => d.status === 'approved');

            if (allApproved && document.driver.status === 'pending') {
                // Auto-move driver to under_review when all docs approved
                await Driver.findByIdAndUpdate(document.driver._id, {
                    status: 'under_review',
                    reviewedBy: req.userId
                });
            }
        }

        // Audit log
        await AuditLog.log({
            action: status === 'approved' ? 'approve' : 'reject',
            entityType: 'document',
            entityId: document._id,
            description: `${status === 'approved' ? 'Approved' : 'Rejected'} ${document.type} document for driver: ${document.driver.fullName}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            previousValues: { status: previousStatus },
            newValues: { status, rejectionReason },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            data: document
        });

    } catch (error) {
        console.error('Update document status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating document status'
        });
    }
});

// @route   DELETE /api/documents/:id
// @desc    Delete document
// @access  Admin only
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        const document = await Document.findById(req.params.id)
            .populate('driver');

        if (!document) {
            return res.status(404).json({
                success: false,
                message: 'Document not found'
            });
        }

        // Delete file
        if (fs.existsSync(document.path)) {
            fs.unlinkSync(document.path);
        }

        await document.deleteOne();

        // Audit log
        await AuditLog.log({
            action: 'delete',
            entityType: 'document',
            entityId: document._id,
            description: `Deleted ${document.type} document for driver: ${document.driver.fullName}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Document deleted'
        });

    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting document'
        });
    }
});



module.exports = router;
