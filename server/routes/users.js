const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { auth } = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

// @route   GET /api/users
// @desc    Get all users
// @access  Admin
router.get('/', auth, isAdmin, async (req, res) => {
    try {
        const { role, isActive, search, page = 1, limit = 20 } = req.query;

        let query = {};

        if (role) {
            query.role = role;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [users, total] = await Promise.all([
            User.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            User.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Admin
router.post('/', auth, isAdmin, async (req, res) => {
    try {
        const { email, password, name, role, phone } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        const user = await User.create({
            email,
            password,
            name,
            role: role || 'sales_agent',
            phone
        });

        // Audit log
        await AuditLog.log({
            action: 'create',
            entityType: 'user',
            entityId: user._id,
            description: `Created new user: ${user.name} (${user.role})`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            newValues: { email, name, role },
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Create user error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating user'
        });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Admin
router.get('/:id', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user'
        });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Admin
router.put('/:id', auth, isAdmin, async (req, res) => {
    try {
        const { name, role, phone, isActive } = req.body;

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const previousValues = {
            name: user.name,
            role: user.role,
            isActive: user.isActive
        };

        // Update fields
        if (name) user.name = name;
        if (role) user.role = role;
        if (phone !== undefined) user.phone = phone;
        if (isActive !== undefined) user.isActive = isActive;

        await user.save();

        // Audit log
        await AuditLog.log({
            action: role !== previousValues.role ? 'role_change' : 'update',
            entityType: 'user',
            entityId: user._id,
            description: `Updated user: ${user.name}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            previousValues,
            newValues: { name, role, isActive },
            ipAddress: req.ip
        });

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user'
        });
    }
});

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password
// @access  Admin
router.put('/:id/reset-password', auth, isAdmin, async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.password = password;
        await user.save();

        // Audit log
        await AuditLog.log({
            action: 'password_change',
            entityType: 'user',
            entityId: user._id,
            description: `Admin reset password for user: ${user.name}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password'
        });
    }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (soft delete - deactivate)
// @access  Admin
router.delete('/:id', auth, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Don't delete self
        if (user._id.toString() === req.userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }

        // Soft delete
        user.isActive = false;
        await user.save();

        // Audit log
        await AuditLog.log({
            action: 'delete',
            entityType: 'user',
            entityId: user._id,
            description: `Deactivated user: ${user.name}`,
            performedBy: req.userId,
            performedByName: req.user.name,
            performedByRole: req.user.role,
            ipAddress: req.ip
        });

        res.json({
            success: true,
            message: 'User deactivated'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

module.exports = router;
