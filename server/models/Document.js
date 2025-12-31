const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },

    type: {
        type: String,
        enum: ['license', 'insurance', 'vehicle_registration', 'photo', 'national_id', 'business_license'],
        required: [true, 'Document type is required']
    },

    // File information
    filename: {
        type: String,
        required: true
    },

    originalName: {
        type: String,
        required: true
    },

    mimeType: {
        type: String,
        required: true,
        enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    },

    size: {
        type: Number,
        required: true,
        max: [5 * 1024 * 1024, 'File size cannot exceed 5MB']
    },

    path: {
        type: String,
        required: true
    },

    // Approval status
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },

    rejectionReason: {
        type: String,
        trim: true,
        maxlength: [500, 'Rejection reason cannot exceed 500 characters']
    },

    // Expiry tracking for licenses/insurance
    expiryDate: {
        type: Date
    },

    // Document number (for licenses, registrations)
    documentNumber: {
        type: String,
        trim: true
    },

    // Relationships
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    reviewedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes
documentSchema.index({ driver: 1, type: 1 });
documentSchema.index({ status: 1, createdAt: -1 });
documentSchema.index({ uploadedBy: 1 });

// Check if document is expired
documentSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});

documentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);
