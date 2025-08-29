const request = require('supertest');
const express = require('express');
const RiderController = require('../../../src/rider/controllers/RiderController');
const RiderService = require('../../../src/rider/services/RiderService');
const { validateRider, validateRiderUpdate, validateObjectId, validateSearchQuery } = require('../../../src/middlewares/validateRace');
const { authenticate } = require('../../../src/middlewares/authMiddleware');
const isAdmin = require('../../../src/middlewares/isAdmin');

jest.mock('../../../src/rider/services/RiderService');
jest.mock('../../../src/middlewares/validateRace');
jest.mock('../../../src/middlewares/authMiddleware');
jest.mock('../../../src/middlewares/isAdmin');

describe('RiderController', () => {
    let app;
    let riderController;
    let mockRiderService;

    const mockRider = {
        _id: '507f1f77bcf86cd799439011',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        nationality: 'American',
        category: 'Professional',
        bikeType: 'Mountain',
        dateOfBirth: new Date('1990-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockAuthUser = {
        id: 'user123',
        email: 'admin@example.com',
        role: 'admin'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        authenticate.mockImplementation((req, res, next) => {
            req.user = mockAuthUser;
            next();
        });

        isAdmin.mockImplementation((req, res, next) => {
            next();
        });

        mockRiderService = {
            createRider: jest.fn(),
            getAllRiders: jest.fn(),
            getRiderById: jest.fn(),
            updateRider: jest.fn(),
            deleteRider: jest.fn(),
            searchRiders: jest.fn()
        };

        RiderService.mockImplementation(() => mockRiderService);

        app = express();
        app.use(express.json());

        riderController = new RiderController();

        app.post('/riders', authenticate, isAdmin, riderController.createRider);
        app.get('/riders', authenticate, isAdmin, riderController.getAllRiders);
        app.get('/riders/search', authenticate, isAdmin, riderController.searchRiders);
        app.get('/riders/:id', authenticate, isAdmin, riderController.getRiderById);
        app.put('/riders/:id', authenticate, isAdmin, riderController.updateRider);
        app.delete('/riders/:id', authenticate, isAdmin, riderController.deleteRider);
    });

    describe('POST /riders - Edge Cases', () => {
        it('should handle duplicate email error with different case', async () => {
            const riderData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'JOHN.DOE@EXAMPLE.COM',
                nationality: 'American',
                category: 'Professional',
                bikeType: 'Mountain',
                dateOfBirth: '1990-01-01'
            };

            validateRider.mockReturnValue({ error: null });
            const dbError = new Error('Duplicate email');
            dbError.code = 11000;
            dbError.keyValue = { email: 'john.doe@example.com' };
            mockRiderService.createRider.mockRejectedValue(dbError);

            const response = await request(app)
                .post('/riders')
                .send(riderData);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('email already exists');
        });

        it('should handle validation error for underage rider', async () => {
            const underageRider = {
                firstName: 'Child',
                lastName: 'Rider',
                email: 'child@example.com',
                nationality: 'American',
                category: 'Youth',
                bikeType: 'Mountain',
                dateOfBirth: new Date().toISOString().split('T')[0]
            };

            const validationError = {
                details: [{
                    message: 'Date of birth cannot be in the future',
                    path: ['dateOfBirth'],
                    context: { value: underageRider.dateOfBirth }
                }]
            };

            validateRider.mockReturnValue({ error: validationError });

            const response = await request(app)
                .post('/riders')
                .send(underageRider);

            expect(response.status).toBe(400);
            expect(response.body.errors[0].field).toBe('dateOfBirth');
        });
    });

    describe('GET /riders - Pagination Edge Cases', () => {
        it('should handle negative page numbers gracefully', async () => {
            const mockResult = { riders: [], totalCount: 0 };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({ page: -1 });

            expect(response.status).toBe(200);
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: -1,
                limit: 10,
                sort: '-createdAt',
                filters: {
                    category: undefined,
                    nationality: undefined
                }
            });
        });

        it('should handle extremely large limit values', async () => {
            const mockResult = { riders: [], totalCount: 0 };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({ limit: 1000 });

            expect(response.status).toBe(200);
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 1,
                limit: 1000,
                sort: '-createdAt',
                filters: {
                    category: undefined,
                    nationality: undefined
                }
            });
        });

        it('should handle invalid sort parameters', async () => {
            const mockResult = { riders: [mockRider], totalCount: 1 };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({ sort: 'invalidField' });

            expect(response.status).toBe(200);
        });
    });

    describe('Database Error Handling', () => {
        it('should handle MongoDB connection errors', async () => {
            validateRider.mockReturnValue({ error: null });
            const connectionError = new Error('MongoDB connection failed');
            connectionError.name = 'MongoNetworkError';
            mockRiderService.createRider.mockRejectedValue(connectionError);

            const response = await request(app)
                .post('/riders')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com',
                    nationality: 'American',
                    category: 'Professional',
                    bikeType: 'Mountain',
                    dateOfBirth: '1990-01-01'
                });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Database operation failed');
        });

        it('should handle validation errors from database layer', async () => {
            validateRider.mockReturnValue({ error: null });
            const validationError = new Error('Database validation failed');
            validationError.name = 'ValidationError';
            validationError.errors = {
                email: {
                    path: 'email',
                    message: 'Email is required',
                    value: ''
                }
            };
            mockRiderService.createRider.mockRejectedValue(validationError);

            const response = await request(app)
                .post('/riders')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: '',
                    nationality: 'American',
                    category: 'Professional',
                    bikeType: 'Mountain',
                    dateOfBirth: '1990-01-01'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Database validation failed');
        });
    });

    describe('Authentication Edge Cases', () => {
        it('should handle expired token', async () => {
            authenticate.mockImplementationOnce((req, res, next) => {
                const error = new Error('Token expired');
                error.name = 'TokenExpiredError';
                return res.status(401).json({
                    success: false,
                    message: 'Token expired',
                    code: 'TOKEN_EXPIRED'
                });
            });

            const response = await request(app).get('/riders');

            expect(response.status).toBe(401);
            expect(response.body.code).toBe('TOKEN_EXPIRED');
        });

        it('should handle non-admin user trying to access admin endpoints', async () => {
            authenticate.mockImplementationOnce((req, res, next) => {
                req.user = { id: 'user123', email: 'user@example.com', role: 'user' };
                next();
            });

            isAdmin.mockImplementationOnce((req, res, next) => {
                return res.status(403).json({
                    success: false,
                    message: 'Admin access required'
                });
            });

            const response = await request(app).get('/riders');

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Admin access required');
        });
    });

    describe('GET /riders/search - Edge Cases', () => {
        it('should handle special characters in search query', async () => {
            const searchQuery = 'John@Doe#2024';
            const mockSearchResult = { riders: [], totalCount: 0 };

            validateSearchQuery.mockReturnValue({
                error: null,
                value: { query: searchQuery, page: 1, limit: 10, sort: '-createdAt' }
            });
            mockRiderService.searchRiders.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/riders/search')
                .query({ query: searchQuery });

            expect(response.status).toBe(200);
            expect(mockRiderService.searchRiders).toHaveBeenCalledWith(searchQuery, {
                page: 1,
                limit: 10,
                sort: '-createdAt'
            });
        });

        it('should handle very long search queries', async () => {
            const longQuery = 'a'.repeat(150);
            const validationError = {
                details: [{
                    message: 'Search query cannot exceed 100 characters',
                    path: ['query'],
                    context: { value: longQuery }
                }]
            };

            validateSearchQuery.mockReturnValue({ error: validationError, value: null });

            const response = await request(app)
                .get('/riders/search')
                .query({ query: longQuery });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].field).toBe('query');
        });

        it('should handle empty search results with proper pagination', async () => {
            const searchQuery = 'NonExistentRider';
            const mockSearchResult = { riders: [], totalCount: 0 };

            validateSearchQuery.mockReturnValue({
                error: null,
                value: { query: searchQuery, page: 1, limit: 10, sort: '-createdAt' }
            });
            mockRiderService.searchRiders.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/riders/search')
                .query({ query: searchQuery });

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
            expect(response.body.meta.pagination.totalItems).toBe(0);
            expect(response.body.meta.pagination.totalPages).toBe(0);
        });
    });

    describe('Performance Scenarios', () => {
        it('should handle multiple concurrent requests', async () => {
            validateRider.mockReturnValue({ error: null });
            mockRiderService.createRider.mockResolvedValue(mockRider);

            const requests = Array(10).fill().map(() =>
                request(app)
                    .post('/riders')
                    .send({
                        firstName: 'Test',
                        lastName: 'User',
                        email: `test${Math.random()}@example.com`,
                        nationality: 'Test',
                        category: 'Amateur',
                        bikeType: 'Test',
                        dateOfBirth: '1990-01-01'
                    })
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(201);
            });
            expect(mockRiderService.createRider).toHaveBeenCalledTimes(10);
        });

        it('should handle large result sets efficiently', async () => {
            const largeRiderList = Array(1000).fill().map((_, index) => ({
                ...mockRider,
                _id: `rider${index}`,
                email: `rider${index}@example.com`
            }));

            const mockResult = {
                riders: largeRiderList.slice(0, 100),
                totalCount: 1000
            };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({ page: 1, limit: 100 });

            expect(response.status).toBe(200);
            expect(response.body.data.riders).toHaveLength(100);
            expect(response.body.data.pagination.totalCount).toBe(1000);
        });
    });

    describe('Security Scenarios', () => {
        it('should prevent NoSQL injection in search', async () => {
            const maliciousQuery = { $gt: '' };
            const validationError = {
                details: [{
                    message: 'Search query must be a string',
                    path: ['query'],
                    context: { value: maliciousQuery }
                }]
            };

            validateSearchQuery.mockReturnValue({ error: validationError, value: null });

            const response = await request(app)
                .get('/riders/search')
                .query({ query: maliciousQuery });

            expect(response.status).toBe(400);
            expect(mockRiderService.searchRiders).not.toHaveBeenCalled();
        });

        it('should prevent XSS attacks in rider data', async () => {
            const maliciousData = {
                firstName: '<script>alert("xss")</script>',
                lastName: 'Doe',
                email: 'test@example.com',
                nationality: 'Test',
                category: 'Amateur',
                bikeType: 'Test',
                dateOfBirth: '1990-01-01'
            };

            const validationError = {
                details: [{
                    message: 'First name must be at least 2 characters',
                    path: ['firstName'],
                    context: { value: maliciousData.firstName }
                }]
            };

            validateRider.mockReturnValue({ error: validationError });

            const response = await request(app)
                .post('/riders')
                .send(maliciousData);

            expect(response.status).toBe(400);
            expect(mockRiderService.createRider).not.toHaveBeenCalled();
        });

        it('should handle SQL injection attempts in filters', async () => {
            const maliciousCategory = "'; DROP TABLE riders; --";

            const mockResult = { riders: [], totalCount: 0 };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({ category: maliciousCategory });

            expect(response.status).toBe(200);
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                sort: '-createdAt',
                filters: {
                    category: maliciousCategory,
                    nationality: undefined
                }
            });
        });
    });

    describe('POST /riders - Edge Cases', () => {
        it('should handle duplicate email error with different case', async () => {
            const riderData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'JOHN.DOE@EXAMPLE.COM',
                nationality: 'American',
                category: 'Professional',
                bikeType: 'Mountain',
                dateOfBirth: '1990-01-01'
            };

            validateRider.mockReturnValue({ error: null });
            const dbError = new Error('Duplicate email');
            dbError.code = 11000;
            dbError.keyValue = { email: 'john.doe@example.com' };
            mockRiderService.createRider.mockRejectedValue(dbError);

            const response = await request(app)
                .post('/riders')
                .send(riderData);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('email already exists');
        });

        it('should handle validation error for underage rider', async () => {
            const underageRider = {
                firstName: 'Child',
                lastName: 'Rider',
                email: 'child@example.com',
                nationality: 'American',
                category: 'Youth',
                bikeType: 'Mountain',
                dateOfBirth: new Date().toISOString().split('T')[0]
            };

            const validationError = {
                details: [{
                    message: 'Date of birth cannot be in the future',
                    path: ['dateOfBirth'],
                    context: { value: underageRider.dateOfBirth }
                }]
            };

            validateRider.mockReturnValue({ error: validationError });

            const response = await request(app)
                .post('/riders')
                .send(underageRider);

            expect(response.status).toBe(400);
            expect(response.body.errors[0].field).toBe('dateOfBirth');
        });
    });

    describe('Service Integration', () => {
        it('should properly instantiate RiderService', () => {
            expect(RiderService).toHaveBeenCalledWith();
            expect(riderController.riderService).toBe(mockRiderService);
        });

        it('should pass correct parameters to service methods', async () => {
            const mockResult = { riders: [mockRider], totalCount: 1 };
            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            await request(app)
                .get('/riders')
                .query({
                    page: 3,
                    limit: 20,
                    sort: 'firstName',
                    category: 'Professional',
                    nationality: 'Canadian'
                });

            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 3,
                limit: 20,
                sort: 'firstName',
                filters: {
                    category: 'Professional',
                    nationality: 'Canadian'
                }
            });
        });
    });
});
