const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findAdminByEmail, createAdmin, updatePassword } = require('../data/repositories/adminRepository');
const { JWT_SECRET } = require('../../config/config');
const { sendEmail } = require('../../utils/emailHandler');
const { checkIfAdminExists } = require('../../utils/validation');
const Admin = require('../data/models/adminModel');

class AdminAuthService {
    async authenticateAdmin(email, password) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Invalid email or password');
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new Error('Invalid email or password');
        }

        const token = jwt.sign(
            { id: admin._id, role: admin.role },
            JWT_SECRET,
            { expiresIn: '3h' }
        );

        // Attempt to send login notification without blocking
        setImmediate(async () => {
            const subject = 'New Admin Login Alert';
            const text = `Hi ${admin.name},

New login detected on your admin account
Time: ${new Date().toLocaleString()}
Email: ${email}

If this wasn't you, please change your password immediately.

Best regards,
Everything Mandalazz Admin Team`;

            try {
                await sendEmail(admin.email, subject, text);
            } catch (error) {
                // Log error but don't affect login flow
                console.error('Admin login notification failed:', {
                    adminId: admin._id,
                    error: error.message
                });
            }
        });

        return token;
    }



    async createAdminAccount(name, email, password) {
        await checkIfAdminExists(name, email);
        const hashedPassword = await bcrypt.hash(password, 10);
        const newAdmin = await createAdmin(name, email, hashedPassword);

        const subject = 'Admin Account Created';
        const text = `Welcome ${name}!

Your admin account has been created successfully.
Email: ${email}

Best regards,
Admin Team`;

        await sendEmail(email, subject, text);
        return newAdmin;
    }

    async forgotPassword(email) {
        const admin = await findAdminByEmail(email);
        if (!admin) {
            throw new Error('Admin not found with this email');
        }

        const rawResetToken = admin.createPasswordResetToken();
        await admin.save();

        const subject = 'Password Reset Request';
        const text = `Hi ${admin.name},

Use this token to reset your password:
${rawResetToken}

This token will expire in 10 minutes.

Best regards,
Admin Team`;

        await sendEmail(email, subject, text);
        return rawResetToken;
    }

    async validateResetToken(token) {
        if (!token) throw new Error('Reset token required');

        const cleaned = token.trim();
        const hashedToken = crypto.createHash('sha256').update(cleaned).digest('hex');

        const admin = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) {
            throw new Error('Invalid or expired reset token');
        }

        return true;
    }

    async resetPassword(token, newPassword) {
        if (!token) throw new Error('Reset token required');
        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        const cleaned = token.trim();
        const hashedToken = crypto.createHash('sha256').update(cleaned).digest('hex');

        const admin = await Admin.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!admin) {
            throw new Error('Invalid or expired reset token');
        }

        admin.password = await bcrypt.hash(newPassword, 10);
        admin.resetPasswordToken = undefined;
        admin.resetPasswordExpire = undefined;
        await admin.save();

        await sendEmail(admin.email, 'Password Reset Complete', 'Your password has been reset successfully.');

        const safeAdmin = admin.toObject();
        delete safeAdmin.password;
        return safeAdmin;
    }

    async changePassword(adminId, oldPassword, newPassword) {
        const admin = await Admin.findById(adminId);
        if (!admin) {
            throw new Error('Admin not found');
        }

        const isOldValid = await bcrypt.compare(oldPassword, admin.password);
        if (!isOldValid) {
            throw new Error('Current password is incorrect');
        }

        if (!newPassword || newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters long');
        }

        const hashedNew = await bcrypt.hash(newPassword, 10);
        await updatePassword(adminId, hashedNew);
        await sendEmail(admin.email, 'Password Changed', 'Your password has been changed successfully.');
        return true;
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
            currentPage: page
        };
    }
}

module.exports = new AdminAuthService();