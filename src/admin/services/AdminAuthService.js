const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { findAdminByEmail, createAdmin, updatePassword } = require('../data/repositories/adminRepository');
const { JWT_SECRET } = require('../../config/config');
const { sendEmail } = require('../../utils/emailHandler');
const { checkIfAdminExists } = require('../../utils/validation');
const Admin = require('../data/models/adminModel');

class AdminAuthService {
    async authenticateAdmin(email, password) {
        const admin = await findAdminByEmail(email);
        if (!admin) throw new Error('Invalid email or password');
        if (!admin.isEmailVerified) throw new Error('Please verify your email before logging in');

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) throw new Error('Invalid email or password');

        admin.lastLogin = new Date();
        await admin.save();

        const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: '3h' });

        setImmediate(async () => {
            try {
                await sendEmail(
                    admin.email,
                    'New Admin Login Alert',
                    `Hi ${admin.firstName} ${admin.lastName},

New login detected on your admin account
Time: ${new Date().toLocaleString()}
Email: ${email}

If this wasn't you, please change your password immediately.

Best regards,
Admin Team`
                );
            } catch (error) {
                console.error('Admin login notification failed:', { adminId: admin._id, error: error.message });
            }
        });

        const adminData = admin.toJSON();
        return {
            token,
            admin: {
                firstName: adminData.firstName,
                lastName: adminData.lastName,
                email: adminData.email,
                role: adminData.role,
                isEmailVerified: adminData.isEmailVerified,
                createdAt: adminData.createdAt,
                updatedAt: adminData.updatedAt
            }
        };
    }

    async createAdminAccount(firstName, lastName, email, password) {
        const cleanedFirstName = firstName.trim();
        const cleanedLastName = lastName.trim();

        if (!/^[a-zA-Z]+$/.test(cleanedFirstName)) throw new Error('First name can only contain letters');
        if (!/^[a-zA-Z]+$/.test(cleanedLastName)) throw new Error('Last name can only contain letters');

        await checkIfAdminExists(cleanedFirstName, cleanedLastName, email);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await createAdmin(cleanedFirstName, cleanedLastName, email, hashedPassword);

        const verificationPin = newAdmin.createEmailVerificationPin();
        await newAdmin.save();

        setImmediate(async () => {
            try {
                await sendEmail(
                    email,
                    'Email Verification Required',
                    `Welcome ${cleanedFirstName} ${cleanedLastName}!

Your admin account has been created successfully. Please verify your email using the PIN below:

Verification TOKEN: ${verificationPin}

This TOKEN will expire in 15 minutes.

Best regards,
Admin Team`
                );
            } catch (error) {
                console.error('Admin verification email failed:', error.message);
            }
        });

        return newAdmin.toJSON();
    }

    async verifyEmail(email, pin) {
        if (!pin || pin.length !== 6) throw new Error('Valid 6-digit PIN is required');

        const hashedPin = crypto.createHash('sha256').update(pin.trim()).digest('hex');
        const admin = await Admin.findOne({
            email: email.toLowerCase(),
            emailVerificationPin: hashedPin,
            emailVerificationExpire: { $gt: Date.now() }
        });

        if (!admin) throw new Error('Invalid or expired verification PIN');

        admin.isEmailVerified = true;
        admin.emailVerificationPin = undefined;
        admin.emailVerificationExpire = undefined;
        await admin.save();

        setImmediate(async () => {
            try {
                await sendEmail(
                    admin.email,
                    'Email Verified Successfully',
                    `Hi ${admin.firstName} ${admin.lastName},

Your email has been verified successfully! You can now log in to your admin account.

Best regards,
Admin Team`
                );
            } catch (error) {
                console.error('Welcome email failed:', error.message);
            }
        });

        return admin.toJSON();
    }

    async resendVerificationToken(email) {
        const admin = await findAdminByEmail(email);
        if (!admin) throw new Error('Admin not found with this email');
        if (admin.isEmailVerified) throw new Error('Email is already verified');

        const verificationPin = admin.createEmailVerificationPin();
        await admin.save();

        await sendEmail(
            email,
            'New Email Verification PIN',
            `Hi ${admin.firstName} ${admin.lastName},

Here is your new email verification TOKEN:

Verification TOKEN: ${verificationPin}

This TOKEN will expire in 15 minutes.

Best regards,
Admin Team`
        );

        return { message: 'New verification PIN sent to email' };
    }

    async forgotPassword(email) {
        const admin = await findAdminByEmail(email);
        if (!admin) throw new Error('Admin not found with this email');
        if (!admin.isEmailVerified) throw new Error('Please verify your email first');

        const rawResetToken = admin.createPasswordResetToken();
        await admin.save();

        await sendEmail(
            email,
            'Password Reset Request',
            `Hi ${admin.firstName} ${admin.lastName},

Use this token to reset your password:
${rawResetToken}

This token will expire in 10 minutes.

Best regards,
Admin Team`
        );

        return { message: 'Password reset token sent to email' };
    }

    async validateResetToken(token) {
        if (!token) throw new Error('Reset token required');

        const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
        const admin = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) throw new Error('Invalid or expired reset token');
        return { valid: true, message: 'Token is valid' };
    }

    async resetPassword(token, newPassword) {
        if (!token) throw new Error('Reset token required');
        if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters long');

        const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
        const admin = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) throw new Error('Invalid or expired reset token');

        admin.password = await bcrypt.hash(newPassword, 10);
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpire = undefined;
        await admin.save();

        setImmediate(async () => {
            try {
                await sendEmail(admin.email, 'Password Reset Complete', 'Your password has been reset successfully.');
            } catch (error) {
                console.error('Password reset email failed:', error.message);
            }
        });

        return admin.toJSON();
    }

    async changePassword(adminId, oldPassword, newPassword) {
        const admin = await Admin.findById(adminId);
        if (!admin) throw new Error('Admin not found');

        const isOldValid = await bcrypt.compare(oldPassword, admin.password);
        if (!isOldValid) throw new Error('Current password is incorrect');
        if (!newPassword || newPassword.length < 6) throw new Error('New password must be at least 6 characters long');

        const hashedNew = await bcrypt.hash(newPassword, 10);
        await updatePassword(adminId, hashedNew);

        setImmediate(async () => {
            try {
                await sendEmail(admin.email, 'Password Changed', 'Your password has been changed successfully.');
            } catch (error) {
                console.error('Password change email failed:', error.message);
            }
        });

        return { message: 'Password changed successfully' };
    }

    logoutUser() {
        return { message: 'Logout successful' };
    }

    async getUserOverviews(page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const User = require('../../user/data/models/userModel');

        const users = await User.find()
            .select('firstName lastName role activityLogs createdAt')
            .populate('checkouts')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const formattedUsers = users.map(user => ({
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            activityLogs: user.activityLogs,
            createdAt: user.createdAt,
            checkouts: user.checkouts
        }));

        const totalUsers = await User.countDocuments();

        return {
            users: formattedUsers,
            totalPages: Math.ceil(totalUsers / limit),
            currentPage: page,
            totalUsers
        };
    }
}

module.exports = new AdminAuthService();
