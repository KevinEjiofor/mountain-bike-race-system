const RiderService = require('../../../src/rider/services/RiderService');
const Rider = require('../../../src/rider/data/models/Rider');
const BaseRepository = require('../../../src/rider/data/repositories/BaseRepository');


jest.mock('../../../src/rider/data/models/Rider');
jest.mock('../../../src/rider/data/repositories/BaseRepository');


describe('RiderService', () => {
    let riderService;
    let mockBaseRepository;

    beforeEach(() => {

        jest.clearAllMocks();


        mockBaseRepository = {
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            count: jest.fn()
        };

        // Mock BaseRepository constructor
        BaseRepository.mockImplementation(() => mockBaseRepository);

        // Create fresh instance
        riderService = new RiderService();
    });

    describe('constructor', () => {
        it('should initialize with BaseRepository instance', () => {
            expect(BaseRepository).toHaveBeenCalledWith(Rider);
            expect(riderService.riderRepository).toBe(mockBaseRepository);
        });
    });

    describe('createRider', () => {
        const mockRiderData = {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            dateOfBirth: new Date('1990-01-01'),
            nationality: 'USA',
            category: 'Amateur',
            bikeType: 'Mountain Bike'
        };

        it('should create a rider successfully', async () => {
            const expectedRider = { _id: '507f1f77bcf86cd799439011', ...mockRiderData };
            mockBaseRepository.create.mockResolvedValue(expectedRider);

            const result = await riderService.createRider(mockRiderData);

            expect(mockBaseRepository.create).toHaveBeenCalledWith(mockRiderData);
            expect(result).toEqual(expectedRider);
        });

        it('should handle database errors during creation', async () => {
            const dbError = new Error('Database connection failed');
            mockBaseRepository.create.mockRejectedValue(dbError);

            await expect(riderService.createRider(mockRiderData))
                .rejects.toThrow('Database connection failed');

            expect(mockBaseRepository.create).toHaveBeenCalledWith(mockRiderData);
        });

        it('should handle validation errors', async () => {
            const validationError = new Error('Validation failed');
            validationError.name = 'ValidationError';
            mockBaseRepository.create.mockRejectedValue(validationError);

            await expect(riderService.createRider(mockRiderData))
                .rejects.toThrow('Validation failed');
        });

        it('should handle duplicate email errors', async () => {
            const duplicateError = new Error('Duplicate key error');
            duplicateError.code = 11000;
            duplicateError.keyPattern = { email: 1 };
            mockBaseRepository.create.mockRejectedValue(duplicateError);

            await expect(riderService.createRider(mockRiderData))
                .rejects.toThrow('Duplicate key error');
        });
    });

    describe('getAllRiders', () => {
        const mockRiders = [
            { _id: '1', firstName: 'John', lastName: 'Doe', category: 'Amateur' },
            { _id: '2', firstName: 'Jane', lastName: 'Smith', category: 'Professional' }
        ];

        it('should return all riders with default pagination', async () => {
            mockBaseRepository.findAll.mockResolvedValue(mockRiders);
            mockBaseRepository.count.mockResolvedValue(2);

            const result = await riderService.getAllRiders({});

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith({}, {
                page: 1,
                limit: 10,
                sort: '-createdAt'
            });
            expect(mockBaseRepository.count).toHaveBeenCalledWith({});
            expect(result).toEqual({
                riders: mockRiders,
                totalCount: 2
            });
        });

        it('should apply category filter', async () => {
            const filteredRiders = [mockRiders[1]];
            mockBaseRepository.findAll.mockResolvedValue(filteredRiders);
            mockBaseRepository.count.mockResolvedValue(1);

            const filters = { category: 'Professional' };
            const result = await riderService.getAllRiders({ filters });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(
                { category: 'Professional' },
                { page: 1, limit: 10, sort: '-createdAt' }
            );
            expect(mockBaseRepository.count).toHaveBeenCalledWith({ category: 'Professional' });
            expect(result.riders).toEqual(filteredRiders);
        });

        it('should apply nationality filter with regex', async () => {
            mockBaseRepository.findAll.mockResolvedValue(mockRiders);
            mockBaseRepository.count.mockResolvedValue(2);

            const filters = { nationality: 'USA' };
            await riderService.getAllRiders({ filters });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(
                { nationality: { $regex: 'USA', $options: 'i' } },
                { page: 1, limit: 10, sort: '-createdAt' }
            );
            expect(mockBaseRepository.count).toHaveBeenCalledWith({
                nationality: { $regex: 'USA', $options: 'i' }
            });
        });

        it('should handle custom pagination', async () => {
            mockBaseRepository.findAll.mockResolvedValue([mockRiders[1]]);
            mockBaseRepository.count.mockResolvedValue(2);

            await riderService.getAllRiders({ page: 2, limit: 1 });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith({}, {
                page: 2,
                limit: 1,
                sort: '-createdAt'
            });
        });

        it('should handle custom sorting', async () => {
            mockBaseRepository.findAll.mockResolvedValue(mockRiders);
            mockBaseRepository.count.mockResolvedValue(2);

            await riderService.getAllRiders({ sort: 'firstName' });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith({}, {
                page: 1,
                limit: 10,
                sort: 'firstName'
            });
        });

        it('should handle multiple filters', async () => {
            mockBaseRepository.findAll.mockResolvedValue([mockRiders[1]]);
            mockBaseRepository.count.mockResolvedValue(1);

            const filters = { category: 'Professional', nationality: 'USA' };
            await riderService.getAllRiders({ filters });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith({
                category: 'Professional',
                nationality: { $regex: 'USA', $options: 'i' }
            }, { page: 1, limit: 10, sort: '-createdAt' });
        });

        it('should handle database errors', async () => {
            mockBaseRepository.findAll.mockRejectedValue(new Error('Database error'));

            await expect(riderService.getAllRiders({}))
                .rejects.toThrow('Database error');
        });
    });

    describe('getRiderById', () => {
        const riderId = '507f1f77bcf86cd799439011';
        const mockRider = { _id: riderId, firstName: 'John', lastName: 'Doe' };

        it('should return rider by ID', async () => {
            mockBaseRepository.findById.mockResolvedValue(mockRider);

            const result = await riderService.getRiderById(riderId);

            expect(mockBaseRepository.findById).toHaveBeenCalledWith(riderId);
            expect(result).toEqual(mockRider);
        });

        it('should return null for non-existent rider', async () => {
            mockBaseRepository.findById.mockResolvedValue(null);

            const result = await riderService.getRiderById(riderId);

            expect(result).toBeNull();
        });

        it('should handle invalid ObjectId format', async () => {
            const invalidId = 'invalid-id';
            mockBaseRepository.findById.mockRejectedValue(new Error('Invalid ObjectId'));

            await expect(riderService.getRiderById(invalidId))
                .rejects.toThrow('Invalid ObjectId');
        });

        it('should handle database connection errors', async () => {
            mockBaseRepository.findById.mockRejectedValue(new Error('Connection timeout'));

            await expect(riderService.getRiderById(riderId))
                .rejects.toThrow('Connection timeout');
        });
    });

    describe('updateRider', () => {
        const riderId = '507f1f77bcf86cd799439011';
        const updateData = { firstName: 'Updated Name' };
        const updatedRider = { _id: riderId, firstName: 'Updated Name', lastName: 'Doe' };

        it('should update rider successfully', async () => {
            mockBaseRepository.update.mockResolvedValue(updatedRider);

            const result = await riderService.updateRider(riderId, updateData);

            expect(mockBaseRepository.update).toHaveBeenCalledWith(riderId, updateData);
            expect(result).toEqual(updatedRider);
        });

        it('should return null for non-existent rider', async () => {
            mockBaseRepository.update.mockResolvedValue(null);

            const result = await riderService.updateRider(riderId, updateData);

            expect(result).toBeNull();
        });

        it('should handle validation errors during update', async () => {
            const validationError = new Error('Validation failed');
            validationError.name = 'ValidationError';
            mockBaseRepository.update.mockRejectedValue(validationError);

            await expect(riderService.updateRider(riderId, updateData))
                .rejects.toThrow('Validation failed');
        });

        it('should handle duplicate email during update', async () => {
            const duplicateError = new Error('Duplicate key error');
            duplicateError.code = 11000;
            mockBaseRepository.update.mockRejectedValue(duplicateError);

            await expect(riderService.updateRider(riderId, { email: 'existing@email.com' }))
                .rejects.toThrow('Duplicate key error');
        });
    });

    describe('deleteRider', () => {
        const riderId = '507f1f77bcf86cd799439011';
        const deletedRider = { _id: riderId, firstName: 'John', lastName: 'Doe' };

        it('should delete rider successfully', async () => {
            mockBaseRepository.delete.mockResolvedValue(deletedRider);

            const result = await riderService.deleteRider(riderId);

            expect(mockBaseRepository.delete).toHaveBeenCalledWith(riderId);
            expect(result).toEqual(deletedRider);
        });

        it('should return null for non-existent rider', async () => {
            mockBaseRepository.delete.mockResolvedValue(null);

            const result = await riderService.deleteRider(riderId);

            expect(result).toBeNull();
        });

        it('should handle database errors during deletion', async () => {
            mockBaseRepository.delete.mockRejectedValue(new Error('Deletion failed'));

            await expect(riderService.deleteRider(riderId))
                .rejects.toThrow('Deletion failed');
        });
    });

    describe('searchRiders', () => {
        const mockRiders = [
            { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' }
        ];

        it('should search riders by firstName', async () => {
            mockBaseRepository.findAll.mockResolvedValue([mockRiders[0]]);
            mockBaseRepository.count.mockResolvedValue(1);

            const result = await riderService.searchRiders('John', {});

            const expectedQuery = {
                $or: [
                    { firstName: { $regex: 'John', $options: 'i' } },
                    { lastName: { $regex: 'John', $options: 'i' } },
                    { email: { $regex: 'John', $options: 'i' } },
                    { nationality: { $regex: 'John', $options: 'i' } }
                ]
            };

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(expectedQuery, {
                page: 1,
                limit: 10,
                sort: '-createdAt'
            });
            expect(mockBaseRepository.count).toHaveBeenCalledWith(expectedQuery);
            expect(result).toEqual({
                riders: [mockRiders[0]],
                totalCount: 1
            });
        });

        it('should handle case-insensitive search', async () => {
            mockBaseRepository.findAll.mockResolvedValue(mockRiders);
            mockBaseRepository.count.mockResolvedValue(2);

            await riderService.searchRiders('JOHN', {});

            const expectedQuery = {
                $or: expect.arrayContaining([
                    { firstName: { $regex: 'JOHN', $options: 'i' } }
                ])
            };

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(
                expectedQuery,
                expect.any(Object)
            );
        });

        it('should handle pagination in search', async () => {
            mockBaseRepository.findAll.mockResolvedValue([mockRiders[1]]);
            mockBaseRepository.count.mockResolvedValue(2);

            await riderService.searchRiders('test', { page: 2, limit: 1 });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(
                expect.any(Object),
                { page: 2, limit: 1, sort: '-createdAt' }
            );
        });

        it('should handle custom sorting in search', async () => {
            mockBaseRepository.findAll.mockResolvedValue(mockRiders);
            mockBaseRepository.count.mockResolvedValue(2);

            await riderService.searchRiders('test', { sort: 'firstName' });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(
                expect.any(Object),
                { page: 1, limit: 10, sort: 'firstName' }
            );
        });

        it('should return empty results for no matches', async () => {
            mockBaseRepository.findAll.mockResolvedValue([]);
            mockBaseRepository.count.mockResolvedValue(0);

            const result = await riderService.searchRiders('nonexistent', {});

            expect(result).toEqual({
                riders: [],
                totalCount: 0
            });
        });

        it('should handle database errors during search', async () => {
            mockBaseRepository.findAll.mockRejectedValue(new Error('Search failed'));

            await expect(riderService.searchRiders('test', {}))
                .rejects.toThrow('Search failed');
        });

        it('should search across all specified fields', async () => {
            mockBaseRepository.findAll.mockResolvedValue(mockRiders);
            mockBaseRepository.count.mockResolvedValue(2);

            await riderService.searchRiders('search-term', {});

            const expectedQuery = {
                $or: [
                    { firstName: { $regex: 'search-term', $options: 'i' } },
                    { lastName: { $regex: 'search-term', $options: 'i' } },
                    { email: { $regex: 'search-term', $options: 'i' } },
                    { nationality: { $regex: 'search-term', $options: 'i' } }
                ]
            };

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith(expectedQuery, expect.any(Object));
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty search query', async () => {
            mockBaseRepository.findAll.mockResolvedValue([]);
            mockBaseRepository.count.mockResolvedValue(0);

            const result = await riderService.searchRiders('', {});

            expect(result.riders).toEqual([]);
            expect(result.totalCount).toBe(0);
        });

        it('should handle null/undefined input gracefully', async () => {
            mockBaseRepository.create.mockRejectedValue(new Error('Cannot read properties of null'));

            await expect(riderService.createRider(null))
                .rejects.toThrow('Cannot read properties of null');

            mockBaseRepository.update.mockRejectedValue(new Error('Update data cannot be null'));

            await expect(riderService.updateRider('validId', null))
                .rejects.toThrow('Update data cannot be null');
        });

        it('should handle network timeout errors', async () => {
            const timeoutError = new Error('Network timeout');
            timeoutError.code = 'ETIMEDOUT';

            mockBaseRepository.findById.mockRejectedValue(timeoutError);

            await expect(riderService.getRiderById('validId'))
                .rejects.toThrow('Network timeout');
        });

        it('should handle empty filters object', async () => {
            mockBaseRepository.findAll.mockResolvedValue([]);
            mockBaseRepository.count.mockResolvedValue(0);

            const result = await riderService.getAllRiders({ filters: {} });

            expect(mockBaseRepository.findAll).toHaveBeenCalledWith({}, expect.any(Object));
            expect(result.riders).toEqual([]);
        });
    });

    describe('Performance Tests', () => {
        it('should handle large result sets efficiently', async () => {
            const largeRiderSet = Array.from({ length: 1000 }, (_, i) => ({
                _id: `id${i}`,
                firstName: `Rider${i}`,
                lastName: 'Test'
            }));

            mockBaseRepository.findAll.mockResolvedValue(largeRiderSet);
            mockBaseRepository.count.mockResolvedValue(1000);

            const startTime = Date.now();
            const result = await riderService.getAllRiders({ limit: 1000 });
            const endTime = Date.now();

            expect(result.riders).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
        });

        it('should handle concurrent search operations', async () => {
            mockBaseRepository.findAll.mockResolvedValue([]);
            mockBaseRepository.count.mockResolvedValue(0);


            const promises = Array.from({ length: 5 }, (_, i) =>
                riderService.searchRiders(`query${i}`, {})
            );

            const results = await Promise.all(promises);

            expect(results).toHaveLength(5);
            expect(mockBaseRepository.findAll).toHaveBeenCalledTimes(5);
            expect(mockBaseRepository.count).toHaveBeenCalledTimes(5);
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle concurrent CRUD operations', async () => {
            const riderData = {
                firstName: 'Concurrent',
                lastName: 'Test',
                email: 'concurrent@test.com',
                dateOfBirth: new Date('1990-01-01'),
                nationality: 'Test',
                bikeType: 'Test'
            };

            mockBaseRepository.create.mockResolvedValue({ _id: 'newId', ...riderData });

            // Simulate concurrent operations
            const promises = Array.from({ length: 5 }, () =>
                riderService.createRider({ ...riderData, email: `test${Math.random()}@example.com` })
            );

            const results = await Promise.all(promises);
            expect(results).toHaveLength(5);
            expect(mockBaseRepository.create).toHaveBeenCalledTimes(5);
        });

        it('should handle mixed operations (create, read, update, delete)', async () => {
            const riderId = 'test-id';
            const riderData = { firstName: 'Test', lastName: 'User' };

            mockBaseRepository.create.mockResolvedValue({ _id: riderId, ...riderData });
            mockBaseRepository.findById.mockResolvedValue({ _id: riderId, ...riderData });
            mockBaseRepository.update.mockResolvedValue({ _id: riderId, ...riderData, firstName: 'Updated' });
            mockBaseRepository.delete.mockResolvedValue({ _id: riderId, ...riderData });


            const created = await riderService.createRider(riderData);
            const found = await riderService.getRiderById(riderId);
            const updated = await riderService.updateRider(riderId, { firstName: 'Updated' });
            const deleted = await riderService.deleteRider(riderId);

            expect(created).toBeDefined();
            expect(found).toBeDefined();
            expect(updated).toBeDefined();
            expect(deleted).toBeDefined();

            expect(mockBaseRepository.create).toHaveBeenCalledTimes(1);
            expect(mockBaseRepository.findById).toHaveBeenCalledTimes(1);
            expect(mockBaseRepository.update).toHaveBeenCalledTimes(1);
            expect(mockBaseRepository.delete).toHaveBeenCalledTimes(1);
        });
    });
});

// Additional test utilities and helpers
const RiderTestHelpers = {
    createMockRider: (overrides = {}) => ({
        _id: '507f1f77bcf86cd799439011',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        dateOfBirth: new Date('1990-01-01'),
        nationality: 'USA',
        category: 'Amateur',
        bikeType: 'Mountain Bike',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    }),

    createMockRiderData: (overrides = {}) => ({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        dateOfBirth: new Date('1990-01-01'),
        nationality: 'USA',
        category: 'Amateur',
        bikeType: 'Mountain Bike',
        ...overrides
    }),

    createMockSearchQuery: (searchTerm) => ({
        $or: [
            { firstName: { $regex: searchTerm, $options: 'i' } },
            { lastName: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { nationality: { $regex: searchTerm, $options: 'i' } }
        ]
    })
};

module.exports = { RiderTestHelpers };