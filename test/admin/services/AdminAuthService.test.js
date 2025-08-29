jest.mock('../../../src/utils/emailHandler', () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AdminAuthService = require('../../../src/admin/services/AdminAuthService.js');
const { findAdminByEmail, createAdmin, updatePassword } = require('../../../src/admin/data/repositories/adminRepository');
const { sendEmail } = require('../../../src/utils/emailHandler');
const { checkIfAdminExists } = require('../../../src/utils/validation');
const Admin = require('../../../src/admin/data/models/adminModel');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');
jest.mock('../../../src/admin/data/repositories/adminRepository');
jest.mock('../../../src/utils/emailHandler');
jest.mock('../../../src/utils/validation');
jest.mock('../../../src/admin/data/models/adminModel');

describe('AdminAuthService', () => {
    let mockAdmin;

    beforeEach(() => {
        jest.clearAllMocks();

        mockAdmin = {
            _id: 'admin123',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            password: 'hashedpassword',
            role: 'admin',
            isEmailVerified: true,
            lastLogin: null,
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01',
            save: jest.fn().mockResolvedValue(true),
            toJSON: jest.fn().mockReturnValue({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                role: 'admin',
                isEmailVerified: true,
                createdAt: '2023-01-01',
                updatedAt: '2023-01-01'
            }),
            createEmailVerificationPin: jest.fn().mockReturnValue('123456'),
            createPasswordResetToken: jest.fn().mockReturnValue('resettoken123')
        };

        global.setImmediate = jest.fn((callback) => callback());
    });

    afterEach(() => {
        delete global.setImmediate;
    });

    describe('authenticateAdmin', () => {
        it('should authenticate admin successfully', async () => {
            findAdminByEmail.mockResolvedValue(mockAdmin);
            bcrypt.compare.mockResolvedValue(true);
            jwt.sign.mockReturnValue('jwt.token.here');
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.authenticateAdmin('john@example.com', 'password123');

            expect(findAdminByEmail).toHaveBeenCalledWith('john@example.com');
            expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedpassword');
            expect(jwt.sign).toHaveBeenCalledWith(
                { id: 'admin123', role: 'admin' },
                process.env.JWT_SECRET,
                { expiresIn: '3h' }
            );
            expect(mockAdmin.save).toHaveBeenCalled();
            expect(result.token).toBe('jwt.token.here');
            expect(result.admin.firstName).toBe('John');
        });

        it('should throw error if admin not found', async () => {
            findAdminByEmail.mockResolvedValue(null);

            await expect(AdminAuthService.authenticateAdmin('wrong@example.com', 'password123'))
                .rejects.toThrow('Invalid email or password');
        });

        it('should throw error if email not verified', async () => {
            mockAdmin.isEmailVerified = false;
            findAdminByEmail.mockResolvedValue(mockAdmin);

            await expect(AdminAuthService.authenticateAdmin('john@example.com', 'password123'))
                .rejects.toThrow('Please verify your email before logging in');
        });

        it('should throw error if password is incorrect', async () => {
            findAdminByEmail.mockResolvedValue(mockAdmin);
            bcrypt.compare.mockResolvedValue(false);

            await expect(AdminAuthService.authenticateAdmin('john@example.com', 'wrongpassword'))
                .rejects.toThrow('Invalid email or password');
        });
    });

    describe('createAdminAccount', () => {
        it('should create admin account successfully', async () => {
            checkIfAdminExists.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('hashedpassword');
            createAdmin.mockResolvedValue(mockAdmin);
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.createAdminAccount('John', 'Doe', 'john@example.com', 'password123');

            expect(checkIfAdminExists).toHaveBeenCalledWith('John', 'Doe', 'john@example.com');
            expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
            expect(createAdmin).toHaveBeenCalledWith('John', 'Doe', 'john@example.com', 'hashedpassword');
            expect(mockAdmin.createEmailVerificationPin).toHaveBeenCalled();
            expect(mockAdmin.save).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalledWith(
                'john@example.com',
                'Email Verification Required',
                expect.stringContaining('123456')
            );
        });

        it('should throw error for invalid first name', async () => {
            await expect(AdminAuthService.createAdminAccount('John123', 'Doe', 'john@example.com', 'password123'))
                .rejects.toThrow('First name can only contain letters');
        });

        it('should throw error for invalid last name', async () => {
            await expect(AdminAuthService.createAdminAccount('John', 'Doe123', 'john@example.com', 'password123'))
                .rejects.toThrow('Last name can only contain letters');
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully', async () => {
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    digest: jest.fn().mockReturnValue('hashedpin')
                })
            });
            Admin.findOne.mockResolvedValue(mockAdmin);
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.verifyEmail('john@example.com', '123456');

            expect(Admin.findOne).toHaveBeenCalledWith({
                email: 'john@example.com',
                emailVerificationPin: 'hashedpin',
                emailVerificationExpire: { $gt: expect.any(Number) }
            });
            expect(mockAdmin.isEmailVerified).toBe(true);
            expect(mockAdmin.emailVerificationPin).toBeUndefined();
            expect(mockAdmin.emailVerificationExpire).toBeUndefined();
            expect(mockAdmin.save).toHaveBeenCalled();
        });

        it('should throw error for invalid PIN length', async () => {
            await expect(AdminAuthService.verifyEmail('john@example.com', '12345'))
                .rejects.toThrow('Valid 6-digit PIN is required');
        });

        it('should throw error for invalid or expired PIN', async () => {
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    digest: jest.fn().mockReturnValue('hashedpin')
                })
            });
            Admin.findOne.mockResolvedValue(null);

            await expect(AdminAuthService.verifyEmail('john@example.com', '123456'))
                .rejects.toThrow('Invalid or expired verification PIN');
        });
    });

    describe('resendVerificationToken', () => {
        it('should resend verification token successfully', async () => {
            mockAdmin.isEmailVerified = false;
            findAdminByEmail.mockResolvedValue(mockAdmin);
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.resendVerificationToken('john@example.com');

            expect(findAdminByEmail).toHaveBeenCalledWith('john@example.com');
            expect(mockAdmin.createEmailVerificationPin).toHaveBeenCalled();
            expect(mockAdmin.save).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalled();
            expect(result.message).toBe('New verification PIN sent to email');
        });

        it('should throw error if admin not found', async () => {
            findAdminByEmail.mockResolvedValue(null);

            await expect(AdminAuthService.resendVerificationToken('wrong@example.com'))
                .rejects.toThrow('Admin not found with this email');
        });

        it('should throw error if email already verified', async () => {
            findAdminByEmail.mockResolvedValue(mockAdmin);

            await expect(AdminAuthService.resendVerificationToken('john@example.com'))
                .rejects.toThrow('Email is already verified');
        });
    });

    describe('forgotPassword', () => {
        it('should send password reset token successfully', async () => {
            findAdminByEmail.mockResolvedValue(mockAdmin);
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.forgotPassword('john@example.com');

            expect(findAdminByEmail).toHaveBeenCalledWith('john@example.com');
            expect(mockAdmin.createPasswordResetToken).toHaveBeenCalled();
            expect(mockAdmin.save).toHaveBeenCalled();
            expect(sendEmail).toHaveBeenCalled();
            expect(result.message).toBe('Password reset token sent to email');
        });

        it('should throw error if admin not found', async () => {
            findAdminByEmail.mockResolvedValue(null);

            await expect(AdminAuthService.forgotPassword('wrong@example.com'))
                .rejects.toThrow('Admin not found with this email');
        });

        it('should throw error if email not verified', async () => {
            mockAdmin.isEmailVerified = false;
            findAdminByEmail.mockResolvedValue(mockAdmin);

            await expect(AdminAuthService.forgotPassword('john@example.com'))
                .rejects.toThrow('Please verify your email first');
        });
    });

    describe('validateResetToken', () => {
        it('should validate reset token successfully', async () => {
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    digest: jest.fn().mockReturnValue('hashedtoken')
                })
            });
            Admin.findOne.mockResolvedValue(mockAdmin);

            const result = await AdminAuthService.validateResetToken('resettoken123');

            expect(Admin.findOne).toHaveBeenCalledWith({
                resetPasswordToken: 'hashedtoken',
                resetPasswordExpire: { $gt: expect.any(Number) }
            });
            expect(result.valid).toBe(true);
            expect(result.message).toBe('Token is valid');
        });

        it('should throw error for missing token', async () => {
            await expect(AdminAuthService.validateResetToken(null))
                .rejects.toThrow('Reset token required');
        });

        it('should throw error for invalid token', async () => {
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    digest: jest.fn().mockReturnValue('hashedtoken')
                })
            });
            Admin.findOne.mockResolvedValue(null);

            await expect(AdminAuthService.validateResetToken('invalidtoken'))
                .rejects.toThrow('Invalid or expired reset token');
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            crypto.createHash.mockReturnValue({
                update: jest.fn().mockReturnValue({
                    digest: jest.fn().mockReturnValue('hashedtoken')
                })
            });
            Admin.findOne.mockResolvedValue(mockAdmin);
            bcrypt.hash.mockResolvedValue('newhashedpassword');
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.resetPassword('resettoken123', 'newpassword123');

            expect(Admin.findOne).toHaveBeenCalledWith({
                resetPasswordToken: 'hashedtoken',
                resetPasswordExpire: { $gt: expect.any(Number) }
            });
            expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
            expect(mockAdmin.password).toBe('newhashedpassword');
            expect(mockAdmin.resetPasswordToken).toBeUndefined();
            expect(mockAdmin.resetPasswordExpire).toBeUndefined();
            expect(mockAdmin.save).toHaveBeenCalled();
        });

        it('should throw error for missing token', async () => {
            await expect(AdminAuthService.resetPassword(null, 'newpassword123'))
                .rejects.toThrow('Reset token required');
        });

        it('should throw error for short password', async () => {
            await expect(AdminAuthService.resetPassword('token', '12345'))
                .rejects.toThrow('New password must be at least 6 characters long');
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            Admin.findById.mockResolvedValue(mockAdmin);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('newhashedpassword');
            updatePassword.mockResolvedValue(mockAdmin);
            sendEmail.mockResolvedValue(true);

            const result = await AdminAuthService.changePassword('admin123', 'oldpassword', 'newpassword123');

            expect(Admin.findById).toHaveBeenCalledWith('admin123');
            expect(bcrypt.compare).toHaveBeenCalledWith('oldpassword', 'hashedpassword');
            expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
            expect(updatePassword).toHaveBeenCalledWith('admin123', 'newhashedpassword');
            expect(result.message).toBe('Password changed successfully');
        });

        it('should throw error if admin not found', async () => {
            Admin.findById.mockResolvedValue(null);

            await expect(AdminAuthService.changePassword('wrongid', 'oldpassword', 'newpassword123'))
                .rejects.toThrow('Admin not found');
        });

        it('should throw error for incorrect old password', async () => {
            Admin.findById.mockResolvedValue(mockAdmin);
            bcrypt.compare.mockResolvedValue(false);

            await expect(AdminAuthService.changePassword('admin123', 'wrongpassword', 'newpassword123'))
                .rejects.toThrow('Current password is incorrect');
        });
    });

    describe('logoutUser', () => {
        it('should return logout success message', () => {
            const result = AdminAuthService.logoutUser();
            expect(result.message).toBe('Logout successful');
        });
    });
});
