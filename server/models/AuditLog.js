const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // What action was performed
    action: {
        type: String,
        required: true,
        enum: [
            'create',
            'update',
            'delete',
            'approve',
            'reject',
            'login',
            'logout',
            'password_change',
            'role_change',
            'status_change'
        ]
    },

    // Which entity was affected
    entityType: {
        type: String,
        required: true,
        enum: ['user', 'driver', 'document', 'system']
    },

    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: function () {
            return this.entityType !== 'system';
        }
    },

    // Human-readable description
    description: {
        type: String,
        required: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },

    // Who performed the action
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    performedByName: {
        type: String,
        required: true
    },

    performedByRole: {
        type: String,
        required: true
    },

    // What changed (for updates)
    previousValues: {
        type: mongoose.Schema.Types.Mixed
    },

    newValues: {
        type: mongoose.Schema.Types.Mixed
    },

    // Request metadata
    ipAddress: {
        type: String
    },

    userAgent: {
        type: String
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ action: 1 });

// Static method to create audit log entry
auditLogSchema.statics.log = async function (data) {
    return await this.create(data);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
