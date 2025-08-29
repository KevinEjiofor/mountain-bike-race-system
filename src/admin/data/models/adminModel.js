const mongoose = require('mongoose');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        minlength: [2, 'First name must be at least 2 characters long'],
        maxlength: [30, 'First name cannot exceed 30 characters'],
        validate: {
            validator: function(v) {
                return /^[a-zA-Z]+$/.test(v);
            },
            message: 'First name can only contain alphabets'
        }
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        minlength: [2, 'Last name must be at least 2 characters long'],
        maxlength: [30, 'Last name cannot exceed 30 characters'],
        validate: {
            validator: function(v) {
                return /^[a-zA-Z]+$/.test(v);
            },
            message: 'Last name can only contain alphabets'
        }
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['admin', 'super_admin'],
        default: 'admin'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    emailVerificationPin: String,
    emailVerificationExpire: Date,
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

adminSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

adminSchema.methods.createPasswordResetToken = function() {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.resetPasswordToken = crypto.createHash('sha256').update(pin).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return pin;
};

adminSchema.methods.createEmailVerificationPin = function() {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    this.emailVerificationPin = crypto.createHash('sha256').update(pin).digest('hex');
    this.emailVerificationExpire = Date.now() + 15 * 60 * 1000;
    return pin;
};

adminSchema.methods.toJSON = function() {
    const adminObject = this.toObject();
    delete adminObject.password;
    delete adminObject.resetPasswordToken;
    delete adminObject.resetPasswordExpire;
    delete adminObject.emailVerificationPin;
    delete adminObject.emailVerificationExpire;
    delete adminObject._id;
    delete adminObject.__v;
    return adminObject;
};

module.exports = mongoose.model('Admin', adminSchema);
