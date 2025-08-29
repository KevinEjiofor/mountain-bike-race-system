const AdminController = require('../../../src/admin/controllers/AdminAuthController');
const AdminAuthService = require('../../../src/admin/services/AdminAuthService');
const { errorResponse, successResponse } = require('../../../src/utils/respondHandler');

jest.mock('../../../src/admin/services/AdminAuthService');
jest.mock('../../../src/utils/respondHandler');

describe('AdminController', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
            user: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        jest.clearAllMocks();
    });

    describe('login', () => {
        it('should login admin successfully with valid credentials', async () => {
            req.body = { email: 'admin@test.com', password: 'password123' };
            const mockResult = {
                token: 'mock-jwt-token',
                admin: {
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'admin@test.com',
                    role: 'admin'
                }
            };
            AdminAuthService.authenticateAdmin.mockResolvedValue(mockResult);

            await AdminController.login(req, res);

            expect(AdminAuthService.authenticateAdmin).toHaveBeenCalledWith('admin@test.com', 'password123');
            expect(successResponse).toHaveBeenCalledWith(res, mockResult, 'Login successful');
        });

        it('should return error when email is missing', async () => {
            req.body = { password: 'password123' };

            await AdminController.login(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Email and password are required', 400);
            expect(AdminAuthService.authenticateAdmin).not.toHaveBeenCalled();
        });

        it('should return error when password is missing', async () => {
            req.body = { email: 'admin@test.com' };

            await AdminController.login(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Email and password are required', 400);
            expect(AdminAuthService.authenticateAdmin).not.toHaveBeenCalled();
        });

        it('should handle authentication service errors', async () => {
            req.body = { email: 'admin@test.com', password: 'wrongpassword' };
            const errorMessage = 'Invalid email or password';
            AdminAuthService.authenticateAdmin.mockRejectedValue(new Error(errorMessage));

            await AdminController.login(req, res);

            expect(AdminAuthService.authenticateAdmin).toHaveBeenCalledWith('admin@test.com', 'wrongpassword');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 401);
        });
    });

    describe('createAdmin', () => {
        it('should create admin successfully with valid data', async () => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'password123'
            };
            const mockNewAdmin = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@test.com',
                role: 'admin'
            };
            AdminAuthService.createAdminAccount.mockResolvedValue(mockNewAdmin);

            await AdminController.createAdmin(req, res);

            expect(AdminAuthService.createAdminAccount).toHaveBeenCalledWith('John', 'Doe', 'john@test.com', 'password123');
            expect(successResponse).toHaveBeenCalledWith(res, mockNewAdmin, 'Admin account created successfully. Please check your email for verification TOKEN.', 201);
        });

        it('should return error when firstName is missing', async () => {
            req.body = {
                lastName: 'Doe',
                email: 'john@test.com',
                password: 'password123'
            };

            await AdminController.createAdmin(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'First name, last name, email, and password are required', 400);
            expect(AdminAuthService.createAdminAccount).not.toHaveBeenCalled();
        });

        it('should return error when lastName is missing', async () => {
            req.body = {
                firstName: 'John',
                email: 'john@test.com',
                password: 'password123'
            };

            await AdminController.createAdmin(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'First name, last name, email, and password are required', 400);
            expect(AdminAuthService.createAdminAccount).not.toHaveBeenCalled();
        });

        it('should handle service errors during admin creation', async () => {
            req.body = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'existing@test.com',
                password: 'password123'
            };
            const errorMessage = 'Admin already exists with this email';
            AdminAuthService.createAdminAccount.mockRejectedValue(new Error(errorMessage));

            await AdminController.createAdmin(req, res);

            expect(AdminAuthService.createAdminAccount).toHaveBeenCalledWith('John', 'Doe', 'existing@test.com', 'password123');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 400);
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully with valid email and pin', async () => {
            req.body = { email: 'admin@test.com', pin: '123456' };
            const mockResult = { email: 'admin@test.com', isEmailVerified: true };
            AdminAuthService.verifyEmail.mockResolvedValue(mockResult);

            await AdminController.verifyEmail(req, res);

            expect(AdminAuthService.verifyEmail).toHaveBeenCalledWith('admin@test.com', '123456');
            expect(successResponse).toHaveBeenCalledWith(res, mockResult, 'Email verified successfully');
        });

        it('should return error when email is missing', async () => {
            req.body = { pin: '123456' };

            await AdminController.verifyEmail(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Email and verification PIN are required', 400);
            expect(AdminAuthService.verifyEmail).not.toHaveBeenCalled();
        });

        it('should return error when pin is missing', async () => {
            req.body = { email: 'admin@test.com' };

            await AdminController.verifyEmail(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Email and verification PIN are required', 400);
            expect(AdminAuthService.verifyEmail).not.toHaveBeenCalled();
        });

        it('should handle invalid verification pin error', async () => {
            req.body = { email: 'admin@test.com', pin: '000000' };
            const errorMessage = 'Invalid or expired verification PIN';
            AdminAuthService.verifyEmail.mockRejectedValue(new Error(errorMessage));

            await AdminController.verifyEmail(req, res);

            expect(AdminAuthService.verifyEmail).toHaveBeenCalledWith('admin@test.com', '000000');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 400);
        });
    });

    describe('resendVerificationToken', () => {
        it('should resend verification token successfully', async () => {
            req.body = { email: 'admin@test.com' };
            AdminAuthService.resendVerificationToken.mockResolvedValue();

            await AdminController.resendVerificationToken(req, res);

            expect(AdminAuthService.resendVerificationToken).toHaveBeenCalledWith('admin@test.com');
            expect(successResponse).toHaveBeenCalledWith(res, null, 'New verification PIN has been sent to your email');
        });

        it('should return error when email is missing', async () => {
            req.body = {};

            await AdminController.resendVerificationToken(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Email is required', 400);
            expect(AdminAuthService.resendVerificationToken).not.toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            req.body = { email: 'nonexistent@test.com' };
            const errorMessage = 'Admin not found with this email';
            AdminAuthService.resendVerificationToken.mockRejectedValue(new Error(errorMessage));

            await AdminController.resendVerificationToken(req, res);

            expect(AdminAuthService.resendVerificationToken).toHaveBeenCalledWith('nonexistent@test.com');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 400);
        });
    });

    describe('forgotPassword', () => {
        it('should send password reset token successfully', async () => {
            req.body = { email: 'admin@test.com' };
            AdminAuthService.forgotPassword.mockResolvedValue();

            await AdminController.forgotPassword(req, res);

            expect(AdminAuthService.forgotPassword).toHaveBeenCalledWith('admin@test.com');
            expect(successResponse).toHaveBeenCalledWith(res, null, 'Password reset token has been sent to your email');
        });

        it('should return error when email is missing', async () => {
            req.body = {};

            await AdminController.forgotPassword(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Email is required', 400);
            expect(AdminAuthService.forgotPassword).not.toHaveBeenCalled();
        });

        it('should handle admin not found error', async () => {
            req.body = { email: 'nonexistent@test.com' };
            const errorMessage = 'Admin not found with this email';
            AdminAuthService.forgotPassword.mockRejectedValue(new Error(errorMessage));

            await AdminController.forgotPassword(req, res);

            expect(AdminAuthService.forgotPassword).toHaveBeenCalledWith('nonexistent@test.com');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 404);
        });
    });

    describe('validateResetToken', () => {
        it('should validate reset token successfully', async () => {
            req.body = { token: 'valid-reset-token' };
            const mockResult = { valid: true, message: 'Token is valid' };
            AdminAuthService.validateResetToken.mockResolvedValue(mockResult);

            await AdminController.validateResetToken(req, res);

            expect(AdminAuthService.validateResetToken).toHaveBeenCalledWith('valid-reset-token');
            expect(successResponse).toHaveBeenCalledWith(res, mockResult, 'Reset token is valid');
        });

        it('should return error when token is missing', async () => {
            req.body = {};

            await AdminController.validateResetToken(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Reset token is required', 400);
            expect(AdminAuthService.validateResetToken).not.toHaveBeenCalled();
        });

        it('should handle invalid token error', async () => {
            req.body = { token: 'invalid-token' };
            const errorMessage = 'Invalid or expired reset token';
            AdminAuthService.validateResetToken.mockRejectedValue(new Error(errorMessage));

            await AdminController.validateResetToken(req, res);

            expect(AdminAuthService.validateResetToken).toHaveBeenCalledWith('invalid-token');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 400);
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            req.body = { token: 'valid-token', newPassword: 'newPassword123' };
            AdminAuthService.resetPassword.mockResolvedValue();

            await AdminController.resetPassword(req, res);

            expect(AdminAuthService.resetPassword).toHaveBeenCalledWith('valid-token', 'newPassword123');
            expect(successResponse).toHaveBeenCalledWith(res, null, 'Password has been reset successfully');
        });

        it('should return error when token is missing', async () => {
            req.body = { newPassword: 'newPassword123' };

            await AdminController.resetPassword(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Token and new password are required', 400);
            expect(AdminAuthService.resetPassword).not.toHaveBeenCalled();
        });

        it('should return error when new password is missing', async () => {
            req.body = { token: 'valid-token' };

            await AdminController.resetPassword(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Token and new password are required', 400);
            expect(AdminAuthService.resetPassword).not.toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            req.body = { token: 'invalid-token', newPassword: 'newPassword123' };
            const errorMessage = 'Invalid or expired reset token';
            AdminAuthService.resetPassword.mockRejectedValue(new Error(errorMessage));

            await AdminController.resetPassword(req, res);

            expect(AdminAuthService.resetPassword).toHaveBeenCalledWith('invalid-token', 'newPassword123');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 400);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            req.user = { id: 'admin-id' };
            req.body = { oldPassword: 'oldPassword123', newPassword: 'newPassword123' };
            const mockResult = { message: 'Password changed successfully' };
            AdminAuthService.changePassword.mockResolvedValue(mockResult);

            await AdminController.changePassword(req, res);

            expect(AdminAuthService.changePassword).toHaveBeenCalledWith('admin-id', 'oldPassword123', 'newPassword123');
            expect(successResponse).toHaveBeenCalledWith(res, null, mockResult.message);
        });

        it('should return error when user is not authenticated', async () => {
            req.user = null;
            req.body = { oldPassword: 'oldPassword123', newPassword: 'newPassword123' };

            await AdminController.changePassword(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Authentication required', 401);
            expect(AdminAuthService.changePassword).not.toHaveBeenCalled();
        });

        it('should return error when old password is missing', async () => {
            req.user = { id: 'admin-id' };
            req.body = { newPassword: 'newPassword123' };

            await AdminController.changePassword(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Both old and new passwords are required', 400);
            expect(AdminAuthService.changePassword).not.toHaveBeenCalled();
        });

        it('should return error when new password is missing', async () => {
            req.user = { id: 'admin-id' };
            req.body = { oldPassword: 'oldPassword123' };

            await AdminController.changePassword(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Both old and new passwords are required', 400);
            expect(AdminAuthService.changePassword).not.toHaveBeenCalled();
        });

        it('should handle incorrect old password error', async () => {
            req.user = { id: 'admin-id' };
            req.body = { oldPassword: 'wrongPassword', newPassword: 'newPassword123' };
            const errorMessage = 'Current password is incorrect';
            AdminAuthService.changePassword.mockRejectedValue(new Error(errorMessage));

            await AdminController.changePassword(req, res);

            expect(AdminAuthService.changePassword).toHaveBeenCalledWith('admin-id', 'wrongPassword', 'newPassword123');
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage, 400);
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            const mockResult = { message: 'Logout successful' };
            AdminAuthService.logoutUser.mockReturnValue(mockResult);

            await AdminController.logout(req, res);

            expect(AdminAuthService.logoutUser).toHaveBeenCalled();
            expect(successResponse).toHaveBeenCalledWith(res, null, mockResult.message);
        });

        it('should handle logout errors', async () => {
            const errorMessage = 'Logout failed';
            AdminAuthService.logoutUser.mockImplementation(() => {
                throw new Error(errorMessage);
            });

            await AdminController.logout(req, res);

            expect(AdminAuthService.logoutUser).toHaveBeenCalled();
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage);
        });
    });

    describe('getUserOverviews', () => {
        it('should get user overviews successfully with default pagination', async () => {
            req.query = {};
            const mockUserOverviews = {
                users: [
                    {
                        firstName: 'John',
                        lastName: 'Doe',
                        role: 'user',
                        activityLogs: [],
                        createdAt: new Date(),
                        checkouts: []
                    }
                ],
                totalPages: 1,
                currentPage: 1,
                totalUsers: 1
            };
            AdminAuthService.getUserOverviews.mockResolvedValue(mockUserOverviews);

            await AdminController.getUserOverviews(req, res);

            expect(AdminAuthService.getUserOverviews).toHaveBeenCalledWith(1, 10);
            expect(successResponse).toHaveBeenCalledWith(res, mockUserOverviews, 'User overviews retrieved successfully');
        });

        it('should get user overviews with custom pagination', async () => {
            req.query = { page: '2', limit: '5' };
            const mockUserOverviews = {
                users: [],
                totalPages: 2,
                currentPage: 2,
                totalUsers: 6
            };
            AdminAuthService.getUserOverviews.mockResolvedValue(mockUserOverviews);

            await AdminController.getUserOverviews(req, res);

            expect(AdminAuthService.getUserOverviews).toHaveBeenCalledWith(2, 5);
            expect(successResponse).toHaveBeenCalledWith(res, mockUserOverviews, 'User overviews retrieved successfully');
        });

        it('should return error when page is not a positive number', async () => {
            req.query = { page: '0', limit: '10' };

            await AdminController.getUserOverviews(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Page and limit must be positive numbers', 400);
            expect(AdminAuthService.getUserOverviews).not.toHaveBeenCalled();
        });

        it('should return error when limit is not a positive number', async () => {
            req.query = { page: '1', limit: '-5' };

            await AdminController.getUserOverviews(req, res);

            expect(errorResponse).toHaveBeenCalledWith(res, 'Page and limit must be positive numbers', 400);
            expect(AdminAuthService.getUserOverviews).not.toHaveBeenCalled();
        });

        it('should handle service errors', async () => {
            req.query = { page: '1', limit: '10' };
            const errorMessage = 'Database connection error';
            AdminAuthService.getUserOverviews.mockRejectedValue(new Error(errorMessage));

            await AdminController.getUserOverviews(req, res);

            expect(AdminAuthService.getUserOverviews).toHaveBeenCalledWith(1, 10);
            expect(errorResponse).toHaveBeenCalledWith(res, errorMessage);
        });
    });
});
