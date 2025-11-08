const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    // Driver Information (matches Sheet1.html)
    driverInfo: {
        name: {
            type: String,
            required: [true, 'Driver name is required'],
            trim: true,
            maxlength: [100, 'Name cannot exceed 100 characters']
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
            match: [/^(251)?[79]\d{8}$/, 'Please enter a valid phone number (e.g., 251912345678)']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            sparse: true
        },
        code: {
            type: String,
            trim: true,
            maxlength: [10, 'Code cannot exceed 10 characters']
        },
        plateNumber: {
            type: String,
            required: [true, 'Plate number is required'],
            uppercase: true,
            trim: true
        },
        registrationStatus: {
            type: String,
            enum: ['registration', 'reactivation'],
            default: 'registration'
        },
        tinNo: {
            type: String,
            trim: true,
            maxlength: [20, 'TIN number cannot exceed 20 characters']
        }
    },

    // Application Status
    status: {
        type: String,
        enum: ['pending', 'under_review', 'approved', 'rejected'],
        default: 'pending'
    },

    rejectionReason: {
        type: String,
        trim: true
    },

    // Document checklist status
    documentsComplete: {
        type: Boolean,
        default: false
    },

    // Relationships
    registeredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // Timestamps for workflow
    submittedAt: {
        type: Date,
        default: Date.now
    },

    reviewedAt: {
        type: Date
    },

    approvedAt: {
        type: Date
    },

    // Notes
    internalNotes: {
        type: String,
        maxlength: [1000, 'Notes cannot exceed 1000 characters']
    }
}, {
    timestamps: true
});

// Indexes for common queries
driverSchema.index({ status: 1, createdAt: -1 });
driverSchema.index({ registeredBy: 1, createdAt: -1 });
driverSchema.index({ 'driverInfo.phone': 1 });
driverSchema.index({ 'driverInfo.plateNumber': 1 });

// Virtual for display name (for backward compatibility)
driverSchema.virtual('fullName').get(function () {
    return this.driverInfo.name;
});

// Ensure virtuals are included in JSON
driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);
