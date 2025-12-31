const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

// @route   GET /api/audit
// @desc    Get audit logs
// @access  Admin
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const {
            action,
            entityType,
            performedBy,
            startDate,
            endDate,
            page = 1,
            limit = 50
        } = req.query;

        let query = {};

        if (action) {
            query.action = action;
        }

        if (entityType) {
            query.entityType = entityType;
        }

        if (performedBy) {
            query.performedBy = performedBy;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                query.createdAt.$lte = new Date(endDate);
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [logs, total] = await Promise.all([
            AuditLog.find(query)
                .populate('performedBy', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            AuditLog.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching audit logs'
        });
    }
});

// @route   GET /api/audit/stats
// @desc    Get audit log statistics
// @access  Admin
router.get('/stats', auth, isAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        const stats = await AuditLog.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: {
                        action: '$action',
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Get action breakdown
        const actionBreakdown = await AuditLog.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: '$action',
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                daily: stats,
                byAction: actionBreakdown.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error('Get audit stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching audit statistics'
        });
    }
});

// @route   GET /api/audit/entity/:type/:id
// @desc    Get audit logs for specific entity
// @access  Admin
router.get('/entity/:type/:id', auth, isAdmin, async (req, res) => {
    try {
        const { type, id } = req.params;

        const logs = await AuditLog.find({
            entityType: type,
            entityId: id
        })
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);

        res.json({
            success: true,
            data: logs
        });

    } catch (error) {
        console.error('Get entity audit error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching entity audit logs'
        });
    }
});

module.exports = router;
