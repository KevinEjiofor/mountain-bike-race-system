const mongoose = require('mongoose');
const crypto = require('crypto');
const RoleEnum = require("../../../enums/roleEnum");

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Name must be at least 3 characters long'],
        match: [/^[A-Za-z]+$/, 'Name can only contain alphabets']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(RoleEnum),
        default: RoleEnum.ADMIN
    },
    resetPasswordToken: {
        type: String,
        default: null
    },
    resetPasswordExpire: {
        type: Date,
        default: null
    }
}, { timestamps: true });


adminSchema.methods.createPasswordResetToken = function () {
    const rawToken = (crypto.randomInt(0, 1000000)).toString().padStart(6, '0'); // e.g., "034159"
    this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return rawToken;
};
module.exports = mongoose.model('Admin', adminSchema);
