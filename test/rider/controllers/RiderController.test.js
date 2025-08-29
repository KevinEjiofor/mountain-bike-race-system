const request = require('supertest');
const express = require('express');
const RiderController = require('../../../src/rider/controllers/RiderController');
const RiderService = require('../../../src/rider/services/RiderService');
const { validateRider, validateRiderUpdate, validateObjectId, validateSearchQuery } = require('../../../src/middlewares/validateRace');
const { authenticate } = require('../../../src/middlewares/authMiddleware');
const isAdmin = require('../../../src/middlewares/isAdmin');

// Mock dependencies
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
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockAuthUser = {
        id: 'user123',
        email: 'admin@example.com',
        role: 'admin'
    };

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock authentication middleware
        authenticate.mockImplementation((req, res, next) => {
            req.user = mockAuthUser;
            next();
        });

        // Mock admin middleware
        isAdmin.mockImplementation((req, res, next) => {
            next();
        });

        // Setup Express app
        app = express();
        app.use(express.json());
        riderController = new RiderController();

        // Setup routes
        app.post('/riders', authenticate, isAdmin, riderController.createRider);
        app.get('/riders', authenticate, isAdmin, riderController.getAllRiders);
        app.get('/riders/search', authenticate, isAdmin, riderController.searchRiders);
        app.get('/riders/:id', authenticate, isAdmin, riderController.getRiderById);
        app.put('/riders/:id', authenticate, isAdmin, riderController.updateRider);
        app.delete('/riders/:id', authenticate, isAdmin, riderController.deleteRider);

        // Mock RiderService instance
        mockRiderService = {
            createRider: jest.fn(),
            getAllRiders: jest.fn(),
            getRiderById: jest.fn(),
            updateRider: jest.fn(),
            deleteRider: jest.fn(),
            searchRiders: jest.fn()
        };

        RiderService.mockImplementation(() => mockRiderService);
    });

    describe('POST /riders - createRider', () => {
        it('should create a rider successfully', async () => {
            const riderData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                nationality: 'American',
                category: 'Professional'
            };

            validateRider.mockReturnValue({ error: null });
            mockRiderService.createRider.mockResolvedValue(mockRider);

            const response = await request(app)
                .post('/riders')
                .send(riderData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Rider created successfully');
            expect(response.body.data.rider).toEqual(mockRider);
            expect(mockRiderService.createRider).toHaveBeenCalledWith(riderData);
        });

        it('should return validation error for invalid data', async () => {
            const invalidData = { firstName: '' };
            const validationError = { details: [{ message: 'firstName is required' }] };

            validateRider.mockReturnValue({ error: validationError });

            const response = await request(app)
                .post('/riders')
                .send(invalidData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toEqual(validationError);
            expect(mockRiderService.createRider).not.toHaveBeenCalled();
        });

        it('should handle database errors', async () => {
            const riderData = {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com'
            };

            validateRider.mockReturnValue({ error: null });
            const dbError = new Error('Database connection failed');
            dbError.code = 'DB_ERROR';
            mockRiderService.createRider.mockRejectedValue(dbError);

            const response = await request(app)
                .post('/riders')
                .send(riderData);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /riders - getAllRiders', () => {
        it('should fetch all riders with default pagination', async () => {
            const mockResult = {
                riders: [mockRider],
                totalCount: 1
            };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app).get('/riders');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.riders).toEqual([mockRider]);
            expect(response.body.data.pagination).toEqual({
                page: 1,
                limit: 10,
                totalCount: 1
            });
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                sort: '-createdAt',
                filters: {
                    category: undefined,
                    nationality: undefined
                }
            });
        });

        it('should fetch riders with custom pagination and filters', async () => {
            const mockResult = {
                riders: [mockRider],
                totalCount: 5
            };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({
                    page: 2,
                    limit: 5,
                    sort: 'firstName',
                    category: 'Professional',
                    nationality: 'American'
                });

            expect(response.status).toBe(200);
            expect(response.body.data.pagination).toEqual({
                page: 2,
                limit: 5,
                totalCount: 5
            });
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 2,
                limit: 5,
                sort: 'firstName',
                filters: {
                    category: 'Professional',
                    nationality: 'American'
                }
            });
        });

        it('should handle service errors', async () => {
            mockRiderService.getAllRiders.mockRejectedValue(new Error('Service error'));

            const response = await request(app).get('/riders');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Failed to fetch riders');
        });
    });

    describe('GET /riders/:id - getRiderById', () => {
        it('should fetch rider by valid ID', async () => {
            validateObjectId.mockReturnValue({ error: null });
            mockRiderService.getRiderById.mockResolvedValue(mockRider);

            const response = await request(app).get(`/riders/${mockRider._id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Rider fetched successfully');
            expect(response.body.data.rider).toEqual(mockRider);
            expect(mockRiderService.getRiderById).toHaveBeenCalledWith(mockRider._id);
        });

        it('should return error for invalid ID format', async () => {
            const invalidId = 'invalid-id';
            validateObjectId.mockReturnValue({
                error: { details: [{ message: 'Invalid ObjectId format' }] }
            });

            const response = await request(app).get(`/riders/${invalidId}`);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe('Invalid rider ID format');
            expect(mockRiderService.getRiderById).not.toHaveBeenCalled();
        });

        it('should return 404 when rider not found', async () => {
            validateObjectId.mockReturnValue({ error: null });
            mockRiderService.getRiderById.mockResolvedValue(null);

            const response = await request(app).get(`/riders/${mockRider._id}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should handle database errors', async () => {
            validateObjectId.mockReturnValue({ error: null });
            const dbError = new Error('Database error');
            mockRiderService.getRiderById.mockRejectedValue(dbError);

            const response = await request(app).get(`/riders/${mockRider._id}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('PUT /riders/:id - updateRider', () => {
        const updateData = {
            firstName: 'Jane',
            lastName: 'Smith'
        };

        it('should update rider successfully', async () => {
            const updatedRider = { ...mockRider, ...updateData };

            validateObjectId.mockReturnValue({ error: null });
            validateRiderUpdate.mockReturnValue({ error: null });
            mockRiderService.updateRider.mockResolvedValue(updatedRider);

            const response = await request(app)
                .put(`/riders/${mockRider._id}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Rider updated successfully');
            expect(response.body.data.rider).toEqual(updatedRider);
            expect(mockRiderService.updateRider).toHaveBeenCalledWith(mockRider._id, updateData);
        });

        it('should return error for invalid ID format', async () => {
            const invalidId = 'invalid-id';
            validateObjectId.mockReturnValue({
                error: { details: [{ message: 'Invalid ObjectId format' }] }
            });

            const response = await request(app)
                .put(`/riders/${invalidId}`)
                .send(updateData);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid rider ID format');
            expect(mockRiderService.updateRider).not.toHaveBeenCalled();
        });

        it('should return validation error for invalid update data', async () => {
            const validationError = { details: [{ message: 'Invalid email format' }] };

            validateObjectId.mockReturnValue({ error: null });
            validateRiderUpdate.mockReturnValue({ error: validationError });

            const response = await request(app)
                .put(`/riders/${mockRider._id}`)
                .send({ email: 'invalid-email' });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toEqual(validationError);
            expect(mockRiderService.updateRider).not.toHaveBeenCalled();
        });

        it('should return 404 when rider not found', async () => {
            validateObjectId.mockReturnValue({ error: null });
            validateRiderUpdate.mockReturnValue({ error: null });
            mockRiderService.updateRider.mockResolvedValue(null);

            const response = await request(app)
                .put(`/riders/${mockRider._id}`)
                .send(updateData);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should handle database errors', async () => {
            validateObjectId.mockReturnValue({ error: null });
            validateRiderUpdate.mockReturnValue({ error: null });
            const dbError = new Error('Database error');
            mockRiderService.updateRider.mockRejectedValue(dbError);

            const response = await request(app)
                .put(`/riders/${mockRider._id}`)
                .send(updateData);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('DELETE /riders/:id - deleteRider', () => {
        it('should delete rider successfully', async () => {
            validateObjectId.mockReturnValue({ error: null });
            mockRiderService.deleteRider.mockResolvedValue(mockRider);

            const response = await request(app).delete(`/riders/${mockRider._id}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Rider deleted successfully');
            expect(mockRiderService.deleteRider).toHaveBeenCalledWith(mockRider._id);
        });

        it('should return error for invalid ID format', async () => {
            const invalidId = 'invalid-id';
            validateObjectId.mockReturnValue({
                error: { details: [{ message: 'Invalid ObjectId format' }] }
            });

            const response = await request(app).delete(`/riders/${invalidId}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid rider ID format');
            expect(mockRiderService.deleteRider).not.toHaveBeenCalled();
        });

        it('should return 404 when rider not found', async () => {
            validateObjectId.mockReturnValue({ error: null });
            mockRiderService.deleteRider.mockResolvedValue(null);

            const response = await request(app).delete(`/riders/${mockRider._id}`);

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });

        it('should handle database errors', async () => {
            validateObjectId.mockReturnValue({ error: null });
            const dbError = new Error('Database error');
            mockRiderService.deleteRider.mockRejectedValue(dbError);

            const response = await request(app).delete(`/riders/${mockRider._id}`);

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /riders/search - searchRiders', () => {
        it('should search riders successfully', async () => {
            const searchQuery = 'John';
            const mockSearchResult = {
                riders: [mockRider],
                totalCount: 1
            };

            const validatedQuery = {
                query: searchQuery,
                page: 1,
                limit: 10,
                sort: '-createdAt'
            };

            validateSearchQuery.mockReturnValue({
                error: null,
                value: validatedQuery
            });
            mockRiderService.searchRiders.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/riders/search')
                .query({ query: searchQuery });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe(`Search results for '${searchQuery}' fetched successfully`);
            expect(response.body.data).toEqual([mockRider]);
            expect(response.body.pagination).toEqual({
                page: 1,
                limit: 10,
                totalCount: 1,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
            });
            expect(mockRiderService.searchRiders).toHaveBeenCalledWith(searchQuery, {
                page: 1,
                limit: 10,
                sort: '-createdAt'
            });
        });

        it('should search with custom pagination parameters', async () => {
            const searchQuery = 'Doe';
            const mockSearchResult = {
                riders: [mockRider],
                totalCount: 15
            };

            const validatedQuery = {
                query: searchQuery,
                page: 2,
                limit: 5,
                sort: 'firstName'
            };

            validateSearchQuery.mockReturnValue({
                error: null,
                value: validatedQuery
            });
            mockRiderService.searchRiders.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/riders/search')
                .query({
                    query: searchQuery,
                    page: 2,
                    limit: 5,
                    sort: 'firstName'
                });

            expect(response.status).toBe(200);
            expect(response.body.pagination).toEqual({
                page: 2,
                limit: 5,
                totalCount: 15,
                totalPages: 3,
                hasNext: true,
                hasPrev: true
            });
            expect(mockRiderService.searchRiders).toHaveBeenCalledWith(searchQuery, {
                page: 2,
                limit: 5,
                sort: 'firstName'
            });
        });

        it('should return validation error for invalid search query', async () => {
            const validationError = { details: [{ message: 'Query parameter is required' }] };

            validateSearchQuery.mockReturnValue({
                error: validationError,
                value: null
            });

            const response = await request(app).get('/riders/search');

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toEqual(validationError);
            expect(mockRiderService.searchRiders).not.toHaveBeenCalled();
        });

        it('should handle database errors during search', async () => {
            const searchQuery = 'John';
            const validatedQuery = {
                query: searchQuery,
                page: 1,
                limit: 10,
                sort: '-createdAt'
            };

            validateSearchQuery.mockReturnValue({
                error: null,
                value: validatedQuery
            });
            const dbError = new Error('Search failed');
            mockRiderService.searchRiders.mockRejectedValue(dbError);

            const response = await request(app)
                .get('/riders/search')
                .query({ query: searchQuery });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });

        it('should return empty results when no riders match search', async () => {
            const searchQuery = 'NonExistent';
            const mockSearchResult = {
                riders: [],
                totalCount: 0
            };

            const validatedQuery = {
                query: searchQuery,
                page: 1,
                limit: 10,
                sort: '-createdAt'
            };

            validateSearchQuery.mockReturnValue({
                error: null,
                value: validatedQuery
            });
            mockRiderService.searchRiders.mockResolvedValue(mockSearchResult);

            const response = await request(app)
                .get('/riders/search')
                .query({ query: searchQuery });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.totalCount).toBe(0);
        });
    });

    describe('Authentication and Authorization', () => {
        beforeEach(() => {
            // Reset middleware mocks for auth tests
            authenticate.mockClear();
            isAdmin.mockClear();
        });

        it('should require authentication for all endpoints', async () => {
            authenticate.mockImplementation((req, res, next) => {
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            });

            const endpoints = [
                { method: 'post', path: '/riders', data: {} },
                { method: 'get', path: '/riders' },
                { method: 'get', path: `/riders/${mockRider._id}` },
                { method: 'put', path: `/riders/${mockRider._id}`, data: {} },
                { method: 'delete', path: `/riders/${mockRider._id}` }
            ];

            for (const endpoint of endpoints) {
                let req = request(app)[endpoint.method](endpoint.path);
                if (endpoint.data) {
                    req = req.send(endpoint.data);
                }

                const response = await req;
                expect(response.status).toBe(401);
                expect(response.body.message).toBe('Unauthorized');
            }
        });

        it('should require admin role for all endpoints', async () => {
            authenticate.mockImplementation((req, res, next) => {
                req.user = mockAuthUser;
                next();
            });

            isAdmin.mockImplementation((req, res, next) => {
                return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
            });

            const response = await request(app).get('/riders');

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Forbidden: Admin access required');
        });
    });

    describe('Input Validation Integration', () => {
        it('should pass through validation errors correctly', async () => {
            const validationError = {
                details: [
                    { message: 'firstName is required', path: ['firstName'] },
                    { message: 'email must be a valid email', path: ['email'] }
                ]
            };

            validateRider.mockReturnValue({ error: validationError });

            const response = await request(app)
                .post('/riders')
                .send({ lastName: 'Doe' });

            expect(response.status).toBe(400);
            expect(response.body.error).toEqual(validationError);
        });

        it('should validate ObjectId format for all ID-based endpoints', async () => {
            const invalidId = 'not-an-objectid';
            const idValidationError = { details: [{ message: 'Invalid ObjectId format' }] };

            validateObjectId.mockReturnValue({ error: idValidationError });

            const idEndpoints = [
                { method: 'get', path: `/riders/${invalidId}` },
                { method: 'put', path: `/riders/${invalidId}`, data: { firstName: 'Test' } },
                { method: 'delete', path: `/riders/${invalidId}` }
            ];

            for (const endpoint of idEndpoints) {
                let req = request(app)[endpoint.method](endpoint.path);
                if (endpoint.data) {
                    req = req.send(endpoint.data);
                }

                const response = await req;
                expect(response.status).toBe(400);
                expect(response.body.message).toBe('Invalid rider ID format');
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle async errors properly with asyncHandler', async () => {
            validateRider.mockReturnValue({ error: null });
            mockRiderService.createRider.mockRejectedValue(new Error('Unexpected error'));

            const response = await request(app)
                .post('/riders')
                .send({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john@example.com'
                });

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });

        it('should maintain consistent error response format', async () => {
            validateObjectId.mockReturnValue({ error: null });
            mockRiderService.getRiderById.mockRejectedValue(new Error('Service unavailable'));

            const response = await request(app).get(`/riders/${mockRider._id}`);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty query parameters gracefully', async () => {
            const mockResult = {
                riders: [],
                totalCount: 0
            };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({});

            expect(response.status).toBe(200);
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                sort: '-createdAt',
                filters: {
                    category: undefined,
                    nationality: undefined
                }
            });
        });

        it('should handle string page and limit parameters', async () => {
            const mockResult = {
                riders: [mockRider],
                totalCount: 1
            };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({
                    page: '2',
                    limit: '5'
                });

            expect(response.status).toBe(200);
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 2,
                limit: 5,
                sort: '-createdAt',
                filters: {
                    category: undefined,
                    nationality: undefined
                }
            });
        });

        it('should handle null/undefined filter values', async () => {
            const mockResult = {
                riders: [mockRider],
                totalCount: 1
            };

            mockRiderService.getAllRiders.mockResolvedValue(mockResult);

            const response = await request(app)
                .get('/riders')
                .query({
                    category: '',
                    nationality: null
                });

            expect(response.status).toBe(200);
            expect(mockRiderService.getAllRiders).toHaveBeenCalledWith({
                page: 1,
                limit: 10,
                sort: '-createdAt',
                filters: {
                    category: undefined,
                    nationality: undefined
                }
            });
        });
    });
});

// Additional integration test for the complete flow
describe('RiderController Integration', () => {
    let app;
    let riderController;

    beforeEach(() => {
        jest.clearAllMocks();

        authenticate.mockImplementation((req, res, next) => {
            req.user = { id: 'admin123', role: 'admin' };
            next();
        });

        isAdmin.mockImplementation((req, res, next) => {
            next();
        });

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

    it('should handle complete rider lifecycle', async () => {
        const riderData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            nationality: 'American',
            category: 'Professional'
        };

        // Mock validation and service responses for the full lifecycle
        validateRider.mockReturnValue({ error: null });
        validateObjectId.mockReturnValue({ error: null });
        validateRiderUpdate.mockReturnValue({ error: null });

        const mockRiderService = {
            createRider: jest.fn().mockResolvedValue(mockRider),
            getAllRiders: jest.fn().mockResolvedValue({
                riders: [mockRider],
                totalCount: 1
            }),
            getRiderById: jest.fn().mockResolvedValue(mockRider),
            updateRider: jest.fn().mockResolvedValue({
                ...mockRider,
                firstName: 'Jane'
            }),
            deleteRider: jest.fn().mockResolvedValue(mockRider)
        };

        RiderService.mockImplementation(() => mockRiderService);

        // Test create
        const createResponse = await request(app)
            .post('/riders')
            .send(riderData);
        expect(createResponse.status).toBe(201);

        // Test get all
        const getAllResponse = await request(app).get('/riders');
        expect(getAllResponse.status).toBe(200);

        // Test get by ID
        const getByIdResponse = await request(app).get(`/riders/${mockRider._id}`);
        expect(getByIdResponse.status).toBe(200);

        // Test update
        const updateResponse = await request(app)
            .put(`/riders/${mockRider._id}`)
            .send({ firstName: 'Jane' });
        expect(updateResponse.status).toBe(200);

        // Test delete
        const deleteResponse = await request(app).delete(`/riders/${mockRider._id}`);
        expect(deleteResponse.status).toBe(200);
    });
});