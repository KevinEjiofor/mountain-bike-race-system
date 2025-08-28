const mongoose = require('mongoose');

const raceResultSchema = new mongoose.Schema({
    rider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rider',
        required: true
    },
    race: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Race',
        required: true
    },
    startTime: {
        type: Date,
        required: true
    },
    finishTime: {
        type: Date
    },
    totalTime: {
        type: Number // Time in seconds
    },
    status: {
        type: String,
        enum: ['Registered', 'Started', 'Finished', 'DNF', 'DSQ'],
        default: 'Registered'
    },
    position: {
        type: Number,
        min: 1
    },
    notes: {
        type: String,
        maxlength: 200
    }
}, {
    timestamps: true
});

raceResultSchema.index({ race: 1, rider: 1 }, { unique: true });
raceResultSchema.index({ race: 1, status: 1 });
raceResultSchema.index({ race: 1, totalTime: 1 });


raceResultSchema.pre('save', function(next) {
    if (this.finishTime && this.startTime && this.status === 'Finished') {
        this.totalTime = Math.floor((this.finishTime - this.startTime) / 1000); // Convert to seconds
    }
    next();
});

module.exports = mongoose.model('RaceResult', raceResultSchema);