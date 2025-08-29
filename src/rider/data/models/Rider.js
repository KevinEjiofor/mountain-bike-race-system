const mongoose = require('mongoose');

const riderSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    nationality: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['Professional', 'Amateur', 'Youth'],
        default: 'Amateur'
    },
    bikeType: {
        type: String,
        required: true
    },
    emergencyContact: {
        name: String,
        phone: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

riderSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

riderSchema.virtual('age').get(function() {
    if (!this.dateOfBirth) return null;
    return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

module.exports = mongoose.model('Rider', riderSchema);