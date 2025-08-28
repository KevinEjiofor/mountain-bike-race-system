const AdminAuthService = require('../services/AdminAuthService');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/respondHandler');

class AdminController {

    async login(req, res) {
        try {
            const { email, password } = req.body;

            const token = await AdminAuthService.authenticateAdmin(email, password, req);
            sendSuccessResponse(res, {
                message: 'Login successful',
                data: { token }
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async createAdmin(req, res) {
        try {
            const { name, email, password } = req.body;
            await AdminAuthService.createAdminAccount(name, email, password);
            sendSuccessResponse(res, {
                message: 'Admin account created successfully'
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            await AdminAuthService.forgotPassword(email);
            sendSuccessResponse(res, {
                message: 'Password reset TOKEN has been sent to the provided email'
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async validateResetToken(req, res) {
        try {
            const { token } = req.body;
            await AdminAuthService.validateResetToken(token);
            sendSuccessResponse(res, {
                message: 'Reset TOKEN is valid'
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            await AdminAuthService.resetPassword(token, newPassword);
            sendSuccessResponse(res, {
                message: 'Password has been reset successfully'
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
    async changePassword(req, res) {
        try {
            if (!req.user) {
                return sendErrorResponse(res, 'Authentication required', 401);
            }

            const { id: adminId } = req.user;
            const { oldPassword, newPassword } = req.body;

            if (!oldPassword || !newPassword) {
                return sendErrorResponse(res, 'Both old and new passwords are required', 400);
            }

            await AdminAuthService.changePassword(adminId, oldPassword, newPassword);
            sendSuccessResponse(res, {
                message: 'Password changed successfully'
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async logout(req, res) {
        try {
            const result = AdminAuthService.logoutUser();
            sendSuccessResponse(res, { message: result.message });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }

    async getUserOverviews(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const userOverviews = await AdminAuthService.getUserOverviews(parseInt(page), parseInt(limit));
            sendSuccessResponse(res, {
                message: 'User overviews retrieved',
                data: userOverviews
            });
        } catch (error) {
            sendErrorResponse(res, error.message);
        }
    }
}

module.exports = new AdminController();
