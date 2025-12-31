const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { requireRole, isOperationsOrAdmin, isSalesAgent } = require('../middleware/rbac');

// @route   POST /api/drivers
// @desc    Create new driver
// @access  Sales Agent, Admin
router.post('/', auth, isSalesAgent, async (req, res) => {
    try {
        const driverData = {
            ...req.body,
            registeredBy: req.userId,
            status: 'pending'
        };

        const driver = await Driver.create(driverData);

        // Audit log
        await AuditLog.log({
            action: 'create',
            entityType: 'driver',
            entityId: driver._id,
            description: `Registered new driver: ${driver.personalInfo.firstName} ${driver.personalInfo.lastName}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            newValues: driverData,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            data: driver
        });

    } catch (error) {
        console.error('Create driver error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating driver'
        });
    }
});

// @route   GET /api/drivers
// @desc    Get all drivers (filtered by role)
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        let query = {};

        // Sales agents only see their own registrations
        if (req.user.role === 'sales_agent') {
            query.registeredBy = req.userId;
        }

        // Filter by status
        if (status && status !== 'all') {
            query.status = status;
        }

        // Search
        if (search) {
            query.$or = [
                { 'personalInfo.firstName': { $regex: search, $options: 'i' } },
                { 'personalInfo.lastName': { $regex: search, $options: 'i' } },
                { 'personalInfo.phone': { $regex: search, $options: 'i' } },
                { 'vehicleInfo.plateNumber': { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [drivers, total] = await Promise.all([
            Driver.find(query)
                .populate('registeredBy', 'name email')
                .populate('reviewedBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            Driver.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: drivers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get drivers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching drivers'
        });
    }
});

// @route   GET /api/drivers/stats
// @desc    Get driver statistics
// @access  Private
router.get('/stats', auth, async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        let dateFilter = {};
        const now = new Date();

        if (period === 'day') {
            dateFilter = { $gte: new Date(now.setHours(0, 0, 0, 0)) };
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { $gte: weekAgo };
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = { $gte: monthAgo };
        }

        let matchStage = { createdAt: dateFilter };

        // Sales agents only see their own stats
        if (req.user.role === 'sales_agent') {
            matchStage.registeredBy = req.userId;
        }

        const stats = await Driver.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get total count
        const total = await Driver.countDocuments(matchStage);

        // Format stats
        const formattedStats = {
            total,
            pending: 0,
            under_review: 0,
            approved: 0,
            rejected: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
        });

        // Get daily breakdown for chart
        const dailyStats = await Driver.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                summary: formattedStats,
                daily: dailyStats.map(d => ({ date: d._id, count: d.count }))
            }
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics'
        });
    }
});

// @route   GET /api/drivers/:id
// @desc    Get single driver
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('registeredBy', 'name email')
            .populate('reviewedBy', 'name email');

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        // Sales agents can only view their own registrations
        if (req.user.role === 'sales_agent' &&
            driver.registeredBy._id.toString() !== req.userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get associated documents
        const documents = await Document.find({ driver: driver._id })
            .populate('uploadedBy', 'name')
            .populate('reviewedBy', 'name');

        res.json({
            success: true,
            data: { driver, documents }
        });

    } catch (error) {
        console.error('Get driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching driver'
        });
    }
});

// @route   PUT /api/drivers/:id
// @desc    Update driver
// @access  Operations, Admin
router.put('/:id', auth, isOperationsOrAdmin, async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const previousValues = driver.toObject();

        // Update allowed fields
        const allowedUpdates = ['personalInfo', 'vehicleInfo', 'internalNotes'];
        allowedUpdates.forEach(field => {
            if (req.body[field]) {
                driver[field] = { ...driver[field], ...req.body[field] };
            }
        });

        await driver.save();

        // Audit log
        await AuditLog.log({
            action: 'update',
            entityType: 'driver',
            entityId: driver._id,
            description: `Updated driver: ${driver.fullName}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            previousValues,
            newValues: req.body,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            data: driver
        });

    } catch (error) {
        console.error('Update driver error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating driver'
        });
    }
});

// @route   PUT /api/drivers/:id/status
// @desc    Update driver status (approve/reject)
// @access  Operations, Admin
router.put('/:id/status', auth, isOperationsOrAdmin, async (req, res) => {
    try {
        const { status, rejectionReason } = req.body;

        if (!['pending', 'under_review', 'approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        if (status === 'rejected' && !rejectionReason) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const driver = await Driver.findById(req.params.id);

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: 'Driver not found'
            });
        }

        const previousStatus = driver.status;

        driver.status = status;
        driver.reviewedBy = req.userId;
        driver.reviewedAt = new Date();

        if (status === 'rejected') {
            driver.rejectionReason = rejectionReason;
        } else if (status === 'approved') {
            driver.approvedAt = new Date();
            driver.rejectionReason = undefined;
        }

        await driver.save();

        // Audit log
        await AuditLog.log({
            action: status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'status_change',
            entityType: 'driver',
            entityId: driver._id,
            description: `Changed driver status from ${previousStatus} to ${status}: ${driver.fullName}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            previousValues: { status: previousStatus },
            newValues: { status, rejectionReason },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            data: driver
        });

    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating driver status'
        });
    }
});

module.exports = router;
