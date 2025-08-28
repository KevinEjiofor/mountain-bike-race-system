const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    location: {
        name: {
            type: String,
            required: true,
            trim: true
        },
        coordinates: {
            latitude: {
                type: Number,
                min: -90,
                max: 90
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180
            }
        }
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date
    },
    distance: {
        type: Number,
        required: true,
        min: 0,
        max: 1000
    },
    difficulty: {
        type: String,
        enum: ['Easy', 'Medium', 'Hard', 'Expert'],
        default: 'Medium'
    },
    maxParticipants: {
        type: Number,
        min: 1,
        max: 10000
    },
    entryFee: {
        type: Number,
        min: 0,
        max: 10000,
        default: 0
    },
    categories: [{
        type: String,
        enum: ['Professional', 'Amateur', 'Youth'],
        default: 'Amateur'
    }],
    status: {
        type: String,
        enum: ['Draft', 'Open', 'Closed', 'InProgress', 'Completed', 'Cancelled'],
        default: 'Draft'
    },
    weatherConditions: {
        temperature: Number,
        humidity: {
            type: Number,
            min: 0,
            max: 100
        },
        windSpeed: {
            type: Number,
            min: 0
        },
        condition: String,
        lastUpdated: Date,
        forecastDate: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
raceSchema.index({ startTime: 1, status: 1 });
raceSchema.index({ status: 1 });
raceSchema.index({ 'location.name': 'text', name: 'text', description: 'text' });

module.exports = mongoose.model('Race', raceSchema);