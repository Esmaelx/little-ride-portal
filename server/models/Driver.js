const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    // Personal Information
    personalInfo: {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters']
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters']
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
            match: [/^(\+251|0)?[97]\d{8}$/, 'Please enter a valid Ethiopian phone number']
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            sparse: true
        },
        address: {
            city: { type: String, default: 'Addis Ababa' },
            subcity: String,
            woreda: String,
            kebele: String
        },
        dateOfBirth: {
            type: Date
        },
        nationalId: {
            type: String,
            trim: true
        }
    },

    // Vehicle Information
    vehicleInfo: {
        plateNumber: {
            type: String,
            required: [true, 'Vehicle plate number is required'],
            uppercase: true,
            trim: true
        },
        make: {
            type: String,
            trim: true
        },
        model: {
            type: String,
            trim: true
        },
        year: {
            type: Number,
            min: [1990, 'Vehicle year must be 1990 or later'],
            max: [new Date().getFullYear() + 1, 'Invalid vehicle year']
        },
        color: {
            type: String,
            trim: true
        },
        vehicleType: {
            type: String,
            enum: ['sedan', 'suv', 'minibus', 'bajaj', 'motorcycle'],
            default: 'sedan'
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
driverSchema.index({ 'personalInfo.phone': 1 });
driverSchema.index({ 'vehicleInfo.plateNumber': 1 });

// Virtual for full name
driverSchema.virtual('fullName').get(function () {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Ensure virtuals are included in JSON
driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Driver', driverSchema);
