const AdminAuthService = require('../services/AdminAuthService');
const { errorResponse, successResponse } = require('../../utils/respondHandler');

class AdminController {
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return errorResponse(res, 'Email and password are required', 400);
            }
            const result = await AdminAuthService.authenticateAdmin(email, password);
            return successResponse(res, result, 'Login successful');
        } catch (error) {
            return errorResponse(res, error.message, 401);
        }
    }

    async createAdmin(req, res) {
        try {
            const { firstName, lastName, email, password } = req.body;
            if (!firstName || !lastName || !email || !password) {
                return errorResponse(res, 'First name, last name, email, and password are required', 400);
            }
            const newAdmin = await AdminAuthService.createAdminAccount(firstName, lastName, email, password);
            return successResponse(res, newAdmin, 'Admin account created successfully. Please check your email for verification TOKEN.', 201);
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async verifyEmail(req, res) {
        try {
            const { email, pin } = req.body;
            if (!email || !pin) {
                return errorResponse(res, 'Email and verification PIN are required', 400);
            }
            const result = await AdminAuthService.verifyEmail(email, pin);
            return successResponse(res, result, 'Email verified successfully');
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async resendVerificationToken(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return errorResponse(res, 'Email is required', 400);
            }
            await AdminAuthService.resendVerificationToken(email);
            return successResponse(res, null, 'New verification PIN has been sent to your email');
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return errorResponse(res, 'Email is required', 400);
            }
            await AdminAuthService.forgotPassword(email);
            return successResponse(res, null, 'Password reset token has been sent to your email');
        } catch (error) {
            return errorResponse(res, error.message, 404);
        }
    }

    async validateResetToken(req, res) {
        try {
            const { token } = req.body;
            if (!token) {
                return errorResponse(res, 'Reset token is required', 400);
            }
            const result = await AdminAuthService.validateResetToken(token);
            return successResponse(res, result, 'Reset token is valid');
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return errorResponse(res, 'Token and new password are required', 400);
            }
            await AdminAuthService.resetPassword(token, newPassword);
            return successResponse(res, null, 'Password has been reset successfully');
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async changePassword(req, res) {
        try {
            if (!req.user) {
                return errorResponse(res, 'Authentication required', 401);
            }
            const { id: adminId } = req.user;
            const { oldPassword, newPassword } = req.body;
            if (!oldPassword || !newPassword) {
                return errorResponse(res, 'Both old and new passwords are required', 400);
            }
            const result = await AdminAuthService.changePassword(adminId, oldPassword, newPassword);
            return successResponse(res, null, result.message);
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    }

    async logout(req, res) {
        try {
            const result = AdminAuthService.logoutUser();
            return successResponse(res, null, result.message);
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }

    async getUserOverviews(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            if (pageNum < 1 || limitNum < 1) {
                return errorResponse(res, 'Page and limit must be positive numbers', 400);
            }
            const userOverviews = await AdminAuthService.getUserOverviews(pageNum, limitNum);
            return successResponse(res, userOverviews, 'User overviews retrieved successfully');
        } catch (error) {
            return errorResponse(res, error.message);
        }
    }
}

module.exports = new AdminController();
