const RaceService = require('../../../src/raceSystem/services/RaceService');
const Race = require('../../../src/raceSystem/data/models/Race');
const Rider = require('../../../src/rider/data/models/Rider');
const RaceResult = require('../../../src/raceSystem/data/models/RaceResult');
const RaceResultRepository = require('../../../src/raceSystem/data/repositories/RaceResultRepository');
const WeatherService = require('../../../src/raceSystem/services/WeatherService');

// Mock the dependencies
jest.mock('../../../src/raceSystem/data/models/Race');
jest.mock('../../../src/rider/data/models/Rider');
jest.mock('../../../src/raceSystem/data/models/RaceResult');
jest.mock('../../../src/raceSystem/data/repositories/RaceResultRepository');
jest.mock('../../../src/raceSystem/services/WeatherService');

describe('RaceService', () => {
    let raceService;
    let mockRaceResultRepository;
    let mockWeatherService;

    const mockRace = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test Race',
        description: 'A test race',
        location: {
            name: 'Test Location',
            coordinates: { latitude: 40.7128, longitude: -74.0060 }
        },
        startTime: new Date('2024-12-01T10:00:00Z'),
        endTime: new Date('2024-12-01T14:00:00Z'),
        distance: 50,
        terrain: 'Road',
        difficulty: 'Medium',
        status: 'Open',
        categories: ['Amateur'],
        save: jest.fn().mockResolvedValue(),
        toObject: jest.fn(() => mockRace)
    };

    const mockRider = {
        _id: '507f1f77bcf86cd799439012',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        category: 'Amateur',
        experience: 'Intermediate',
        toObject: jest.fn(() => mockRider)
    };

    const mockRaceResult = {
        _id: '507f1f77bcf86cd799439013',
        race: mockRace._id,
        rider: mockRider._id,
        startTime: new Date('2024-12-01T10:00:00Z'),
        finishTime: new Date('2024-12-01T12:30:00Z'),
        totalTime: 9000,
        status: 'Finished',
        position: 1,
        notes: '',
        toObject: jest.fn(() => mockRaceResult)
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock RaceResultRepository
        mockRaceResultRepository = {
            getRidersWhoDidNotFinish: jest.fn(),
            getRidersNotInRace: jest.fn(),
            getTop3FastestInRace: jest.fn(),
            getResultsByRace: jest.fn(),
            updateRacePositions: jest.fn()
        };
        RaceResultRepository.mockImplementation(() => mockRaceResultRepository);

        // Mock WeatherService
        mockWeatherService = {
            getCurrentWeather: jest.fn(),
            getForecast: jest.fn()
        };
        WeatherService.mockImplementation(() => mockWeatherService);

        raceService = new RaceService();
    });

    describe('createRace', () => {
        it('should create a race successfully', async () => {
            const raceData = {
                name: 'Test Race',
                location: { name: 'Test Location', coordinates: { latitude: 40.7128, longitude: -74.0060 } },
                startTime: '2024-12-01T10:00:00Z',
                distance: 50
            };

            Race.mockImplementation(() => mockRace);
            mockRace.save.mockResolvedValue(mockRace);

            const result = await raceService.createRace(raceData);

            expect(Race).toHaveBeenCalledWith(raceData);
            expect(mockRace.save).toHaveBeenCalled();
            expect(result).toBe(mockRace);
        });

        it('should handle database errors during race creation', async () => {
            const raceData = { name: 'Test Race' };
            const dbError = new Error('Database connection failed');

            Race.mockImplementation(() => mockRace);
            mockRace.save.mockRejectedValue(dbError);

            await expect(raceService.createRace(raceData)).rejects.toThrow('Database connection failed');
        });
    });

    describe('getRaceById', () => {
        it('should return a race by ID', async () => {
            const raceId = '507f1f77bcf86cd799439011';

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            const result = await raceService.getRaceById(raceId);

            expect(Race.findById).toHaveBeenCalledWith(raceId);
            expect(result).toBe(mockRace);
        });

        it('should return null if race not found', async () => {
            const raceId = '507f1f77bcf86cd799439011';

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null)
            });

            const result = await raceService.getRaceById(raceId);

            expect(result).toBeNull();
        });
    });

    describe('searchRaces', () => {
        it('should search races with query and pagination', async () => {
            const searchQuery = 'test';
            const options = { page: 1, limit: 10, sort: '-createdAt' };
            const mockRaces = [mockRace];
            const totalCount = 1;

            Race.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockRaces)
            });

            Race.countDocuments.mockReturnValue({
                exec: jest.fn().mockResolvedValue(totalCount)
            });

            const result = await raceService.searchRaces(searchQuery, options);

            expect(Race.find).toHaveBeenCalledWith({
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } },
                    { 'location.name': { $regex: searchQuery, $options: 'i' } },
                    { terrain: { $regex: searchQuery, $options: 'i' } }
                ]
            });
            expect(result).toEqual({ races: mockRaces, totalCount });
        });
    });

    describe('startRace', () => {
        it('should start a race successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const updatedRace = { ...mockRace, status: 'InProgress' };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            Race.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedRace)
            });

            RaceResult.updateMany.mockResolvedValue({ acknowledged: true });
            RaceResult.countDocuments.mockResolvedValue(5);

            const result = await raceService.startRace(raceId);

            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                expect.objectContaining({
                    status: 'InProgress',
                    startTime: expect.any(Date)
                }),
                { new: true }
            );

            expect(RaceResult.updateMany).toHaveBeenCalledWith(
                {
                    race: raceId,
                    status: 'Registered'
                },
                expect.objectContaining({
                    status: 'Started',
                    startTime: expect.any(Date)
                })
            );

            expect(result).toEqual({
                race: updatedRace,
                ridersStarted: 5,
                massStartTime: expect.any(Date)
            });
        });

        it('should throw error if race not found', async () => {
            const raceId = '507f1f77bcf86cd799439011';

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null)
            });

            await expect(raceService.startRace(raceId)).rejects.toThrow('Race not found');
        });

        it('should auto-transition from Draft to Open', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const draftRace = { ...mockRace, status: 'Draft' };
            const openRace = { ...draftRace, status: 'Open' };
            const updatedRace = { ...openRace, status: 'InProgress', startTime: new Date() };

            Race.findById
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValue(draftRace)
                })
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValue(openRace)
                });

            Race.findByIdAndUpdate
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValue(openRace)
                })
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValue(updatedRace)
                });

            RaceResult.updateMany.mockResolvedValue({ acknowledged: true });
            RaceResult.countDocuments.mockResolvedValue(3);

            const result = await raceService.startRace(raceId);

            expect(Race.findByIdAndUpdate).toHaveBeenCalledTimes(2);
            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                { status: 'Open' },
                { new: true }
            );
            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                expect.objectContaining({
                    status: 'InProgress',
                    startTime: expect.any(Date)
                }),
                { new: true }
            );
            expect(result.race.status).toBe('InProgress');
        });
    });

    describe('finishRider', () => {
        it('should finish a rider successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';
            const startedResult = {
                ...mockRaceResult,
                status: 'Started',
                _id: '507f1f77bcf86cd799439013'
            };

            const updatedResult = {
                ...startedResult,
                status: 'Finished',
                finishTime: new Date(),
                totalTime: 9000,
                position: 1,
                rider: {
                    _id: riderId,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com',
                    category: 'Amateur'
                },
                toObject: jest.fn().mockReturnValue({
                    ...startedResult,
                    status: 'Finished',
                    finishTime: expect.any(Date),
                    totalTime: 9000,
                    position: 1,
                    rider: {
                        _id: riderId,
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@example.com',
                        category: 'Amateur'
                    }
                })
            };

            RaceResult.findOne.mockResolvedValue(startedResult);
            RaceResult.findByIdAndUpdate.mockReturnValue({
                populate: jest.fn().mockResolvedValue(updatedResult)
            });

            mockRaceResultRepository.updateRacePositions.mockResolvedValue();
            mockRaceResultRepository.getTop3FastestInRace.mockResolvedValue([updatedResult]);

            const result = await raceService.finishRider(raceId, riderId);

            expect(RaceResult.findOne).toHaveBeenCalledWith({
                race: raceId,
                rider: riderId,
                status: 'Started'
            });

            expect(RaceResult.findByIdAndUpdate).toHaveBeenCalledWith(
                startedResult._id,
                expect.objectContaining({
                    status: 'Finished',
                    finishTime: expect.any(Date),
                    totalTime: expect.any(Number)
                }),
                { new: true }
            );

            expect(result.formattedTime).toBeDefined();
            expect(result.status).toBe('Finished');
        });

        it('should throw error if rider not started', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';

            RaceResult.findOne.mockResolvedValue(null);

            await expect(raceService.finishRider(raceId, riderId))
                .rejects.toThrow('Rider not found or not started yet');
        });
    });

    describe('getLiveStandings', () => {
        it('should return live race standings', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const finishedRiders = [
                { ...mockRaceResult, status: 'Finished', totalTime: 8000, toObject: jest.fn().mockReturnValue({ ...mockRaceResult, status: 'Finished', totalTime: 8000 }) },
                { ...mockRaceResult, status: 'Finished', totalTime: 9000, toObject: jest.fn().mockReturnValue({ ...mockRaceResult, status: 'Finished', totalTime: 9000 }) }
            ];
            const startedRiders = [{ status: 'Started', toObject: jest.fn().mockReturnValue({ status: 'Started' }) }];
            const dnfRiders = [{ status: 'DNF', toObject: jest.fn().mockReturnValue({ status: 'DNF' }) }];
            const dsqRiders = [];

            RaceResult.find
                .mockImplementationOnce(() => ({
                    populate: jest.fn().mockReturnValue({
                        sort: jest.fn().mockResolvedValue(finishedRiders)
                    })
                }))
                .mockImplementationOnce(() => ({
                    populate: jest.fn().mockResolvedValue(startedRiders)
                }))
                .mockImplementationOnce(() => ({
                    populate: jest.fn().mockResolvedValue(dnfRiders)
                }))
                .mockImplementationOnce(() => ({
                    populate: jest.fn().mockResolvedValue(dsqRiders)
                }));

            const result = await raceService.getLiveStandings(raceId);

            expect(result).toEqual({
                finished: expect.arrayContaining([
                    expect.objectContaining({
                        position: 1,
                        formattedTime: expect.any(String)
                    })
                ]),
                stillRacing: 1,
                dnf: 1,
                dsq: 0,
                totalStarted: 4
            });
        });
    });

    describe('updateRaceWeather', () => {
        it('should update weather for future race (forecast)', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const futureRace = {
                ...mockRace,
                startTime: new Date(Date.now() + 86400000) // Tomorrow
            };
            const weatherData = {
                temperature: 22,
                humidity: 65,
                windSpeed: 5,
                condition: 'Partly cloudy',
                forecastDate: futureRace.startTime
            };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(futureRace)
            });

            mockWeatherService.getForecast.mockResolvedValue(weatherData);

            Race.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...futureRace,
                    weatherConditions: weatherData
                })
            });

            const result = await raceService.updateRaceWeather(raceId);

            expect(mockWeatherService.getForecast).toHaveBeenCalledWith(
                40.7128,
                -74.0060,
                futureRace.startTime
            );
            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                { weatherConditions: weatherData },
                { new: true }
            );
            expect(result.weatherConditions).toEqual(weatherData);
        });

        it('should update weather for current/past race (current weather)', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const pastRace = {
                ...mockRace,
                startTime: new Date(Date.now() - 3600000) // 1 hour ago
            };
            const weatherData = {
                temperature: 25,
                humidity: 60,
                windSpeed: 3,
                condition: 'Sunny',
                lastUpdated: new Date()
            };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(pastRace)
            });

            mockWeatherService.getCurrentWeather.mockResolvedValue(weatherData);

            Race.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue({
                    ...pastRace,
                    weatherConditions: weatherData
                })
            });

            const result = await raceService.updateRaceWeather(raceId);

            expect(mockWeatherService.getCurrentWeather).toHaveBeenCalledWith(40.7128, -74.0060);
            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                { weatherConditions: weatherData },
                { new: true }
            );
            expect(result.weatherConditions).toEqual(weatherData);
        });

        it('should throw error if race has no coordinates', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const raceWithoutCoords = {
                ...mockRace,
                location: { name: 'Test Location' } // No coordinates
            };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(raceWithoutCoords)
            });

            await expect(raceService.updateRaceWeather(raceId))
                .rejects.toThrow('Race or coordinates not found');
        });
    });

    describe('getTop3FastestRiders', () => {
        it('should return top 3 fastest riders with gaps', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const mockResults = [
                { ...mockRaceResult, totalTime: 8000, toObject: jest.fn().mockReturnValue({ ...mockRaceResult, totalTime: 8000 }) },
                { ...mockRaceResult, totalTime: 8500, toObject: jest.fn().mockReturnValue({ ...mockRaceResult, totalTime: 8500 }) },
                { ...mockRaceResult, totalTime: 9000, toObject: jest.fn().mockReturnValue({ ...mockRaceResult, totalTime: 9000 }) }
            ];

            mockRaceResultRepository.getTop3FastestInRace.mockResolvedValue(mockResults);

            const result = await raceService.getTop3FastestRiders(raceId);

            expect(result).toHaveLength(3);
            expect(result[0]).toMatchObject({
                rank: 1,
                gap: null,
                formattedTime: expect.any(String)
            });
            expect(result[1]).toMatchObject({
                rank: 2,
                gap: expect.stringContaining('+'),
                formattedTime: expect.any(String)
            });
        });

        it('should return empty array if no results', async () => {
            const raceId = '507f1f77bcf86cd799439011';

            mockRaceResultRepository.getTop3FastestInRace.mockResolvedValue([]);

            const result = await raceService.getTop3FastestRiders(raceId);

            expect(result).toEqual([]);
        });
    });

    describe('getRidersWhoDidNotFinish', () => {
        it('should return DNF and DSQ riders with aggregated reasons', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const mockDnfResults = [
                { status: 'DNF', notes: 'Mechanical failure', toObject: jest.fn().mockReturnValue({ status: 'DNF', notes: 'Mechanical failure' }) },
                { status: 'DNF', notes: 'Mechanical failure', toObject: jest.fn().mockReturnValue({ status: 'DNF', notes: 'Mechanical failure' }) },
                { status: 'DSQ', notes: 'Rule violation', toObject: jest.fn().mockReturnValue({ status: 'DSQ', notes: 'Rule violation' }) }
            ];

            mockRaceResultRepository.getRidersWhoDidNotFinish.mockResolvedValue(mockDnfResults);

            const result = await raceService.getRidersWhoDidNotFinish(raceId);

            expect(result).toEqual({
                dnf: expect.arrayContaining([
                    expect.objectContaining({ status: 'DNF' })
                ]),
                dsq: expect.arrayContaining([
                    expect.objectContaining({ status: 'DSQ' })
                ]),
                total: 3,
                reasons: {
                    'Mechanical failure': 2,
                    'Rule violation': 1
                }
            });
        });
    });

    describe('getRidersNotInRace', () => {
        it('should return non-participating riders with eligibility', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const nonParticipantIds = ['507f1f77bcf86cd799439014'];
            const nonParticipant = {
                _id: '507f1f77bcf86cd799439014',
                firstName: 'Jane',
                lastName: 'Smith',
                category: 'Professional',
                toObject: jest.fn().mockReturnValue({
                    _id: '507f1f77bcf86cd799439014',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    category: 'Professional'
                })
            };

            Race.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    exec: jest.fn().mockResolvedValue(mockRace)
                })
            });

            Rider.find
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValue([mockRider, nonParticipant])
                })
                .mockReturnValueOnce({
                    exec: jest.fn().mockResolvedValue([nonParticipant])
                });

            mockRaceResultRepository.getRidersNotInRace.mockResolvedValue(nonParticipantIds);

            const result = await raceService.getRidersNotInRace(raceId);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                eligible: expect.any(Boolean),
                canRegister: expect.any(Boolean)
            });
        });
    });

    describe('canRaceBeStarted', () => {
        it('should allow manual start regardless of time', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const futureRace = {
                ...mockRace,
                startTime: new Date(Date.now() + 3600000) // 1 hour in future
            };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(futureRace)
            });

            const result = await raceService.canRaceBeStarted(raceId, true);

            expect(result).toEqual({
                canStart: true,
                reason: null
            });
        });

        it('should prevent automatic start if too early', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const futureRace = {
                ...mockRace,
                startTime: new Date(Date.now() + 3600000) // 1 hour in future
            };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(futureRace)
            });

            const result = await raceService.canRaceBeStarted(raceId, false);

            expect(result.canStart).toBe(false);
            expect(result.reason).toMatch(/Race starts in \d+ minutes/);
        });

        it('should reject if race status is not Open', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const closedRace = { ...mockRace, status: 'Closed' };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(closedRace)
            });

            const result = await raceService.canRaceBeStarted(raceId);

            expect(result).toEqual({
                canStart: false,
                reason: 'Race status must be Open to start'
            });
        });
    });

    describe('finishRace', () => {
        it('should finish a race successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const inProgressRace = { ...mockRace, status: 'InProgress' };
            const completedRace = { ...inProgressRace, status: 'Completed', endTime: new Date() };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(inProgressRace)
            });

            Race.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(completedRace)
            });

            const result = await raceService.finishRace(raceId);

            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                expect.objectContaining({
                    status: 'Completed',
                    endTime: expect.any(Date)
                }),
                { new: true }
            );
            expect(result).toBe(completedRace);
        });

        it('should throw error if race is not in progress', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const openRace = { ...mockRace, status: 'Open' };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(openRace)
            });

            await expect(raceService.finishRace(raceId))
                .rejects.toThrow('Only races in progress can be finished');
        });
    });

    describe('generateRaceReport', () => {
        it('should generate comprehensive race report', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const mockResults = [mockRaceResult];
            const mockTop3 = [mockRaceResult];
            const mockDnf = { total: 0, dnf: [], dsq: [], reasons: {} };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            mockRaceResultRepository.getResultsByRace.mockResolvedValue(mockResults);
            raceService.getTop3FastestRiders = jest.fn().mockResolvedValue(mockTop3);
            raceService.getRidersWhoDidNotFinish = jest.fn().mockResolvedValue(mockDnf);

            const result = await raceService.generateRaceReport(raceId);

            expect(result).toMatchObject({
                race: expect.objectContaining({
                    id: mockRace._id,
                    name: mockRace.name
                }),
                statistics: expect.objectContaining({
                    totalParticipants: 1,
                    finishedCount: 1,
                    dnfCount: 0
                }),
                top3Fastest: mockTop3,
                didNotFinish: mockDnf
            });
        });

        it('should return null race if not found', async () => {
            const raceId = '507f1f77bcf86cd799439011';

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null)
            });

            const result = await raceService.generateRaceReport(raceId);

            expect(result).toEqual({ race: null });
        });
    });

    describe('registerParticipant', () => {
        it('should register participant successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';
            const savedRegistration = { ...mockRaceResult, status: 'Registered' };

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            Rider.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRider)
            });

            RaceResult.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null) // No existing registration
            });

            RaceResult.mockImplementation(() => ({
                save: jest.fn().mockResolvedValue(savedRegistration)
            }));

            const result = await raceService.registerParticipant(raceId, riderId);

            expect(RaceResult).toHaveBeenCalledWith({
                race: raceId,
                rider: riderId,
                status: 'Registered'
            });
            expect(result).toBe(savedRegistration);
        });

        it('should throw error if rider already registered', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            Rider.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRider)
            });

            RaceResult.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRaceResult)
            });

            await expect(raceService.registerParticipant(raceId, riderId))
                .rejects.toThrow('Rider already registered for this race');
        });

        it('should throw error if race not found', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';

            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null)
            });

            await expect(raceService.registerParticipant(raceId, riderId))
                .rejects.toThrow('Race not found');
        });
    });

    describe('getAllRaces', () => {
        it('should get all races with filters and pagination', async () => {
            const options = {
                page: 1,
                limit: 10,
                sort: '-createdAt',
                filters: {
                    status: 'Open',
                    difficulty: 'Medium',
                    category: 'Amateur',
                    terrain: 'Road'
                }
            };
            const mockRaces = [mockRace];
            const totalCount = 1;

            Race.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockRaces)
            });

            Race.countDocuments.mockReturnValue({
                exec: jest.fn().mockResolvedValue(totalCount)
            });

            const result = await raceService.getAllRaces(options);

            expect(Race.find).toHaveBeenCalledWith({
                status: 'Open',
                difficulty: 'Medium',
                categories: { $in: ['Amateur'] },
                terrain: 'Road'
            });
            expect(result).toEqual({ races: mockRaces, totalCount });
        });
    });

    describe('utility methods', () => {
        describe('formatTime', () => {
            it('should format time correctly for hours, minutes, seconds', () => {
                expect(raceService.formatTime(3661)).toBe('1:01:01'); // 1 hour 1 minute 1 second
                expect(raceService.formatTime(125)).toBe('2:05'); // 2 minutes 5 seconds
                expect(raceService.formatTime(59)).toBe('0:59'); // 59 seconds
            });

            it('should return null for falsy input', () => {
                expect(raceService.formatTime(null)).toBeNull();
                expect(raceService.formatTime(0)).toBeNull();
            });
        });

        describe('checkRiderEligibility', () => {
            it('should return true if rider category matches race categories', () => {
                const rider = { category: 'Amateur' };
                const race = { categories: ['Amateur', 'Professional'] };

                const result = raceService.checkRiderEligibility(rider, race);
                expect(result).toBe(true);
            });

            it('should return false if rider category does not match', () => {
                const rider = { category: 'Youth' };
                const race = { categories: ['Amateur', 'Professional'] };

                const result = raceService.checkRiderEligibility(rider, race);
                expect(result).toBe(false);
            });
        });

        describe('canRiderRegister', () => {
            it('should return true if race is open and rider is eligible', () => {
                const rider = { category: 'Amateur' };
                const race = { status: 'Open', categories: ['Amateur'] };

                const result = raceService.canRiderRegister(rider, race);
                expect(result).toBe(true);
            });

            it('should return false if race is not open', () => {
                const rider = { category: 'Amateur' };
                const race = { status: 'Closed', categories: ['Amateur'] };

                const result = raceService.canRiderRegister(rider, race);
                expect(result).toBe(false);
            });
        });

        describe('aggregateDNFReasons', () => {
            it('should aggregate DNF reasons correctly', () => {
                const dnfRiders = [
                    { notes: 'Mechanical failure' },
                    { notes: 'Mechanical failure' },
                    { notes: 'Crash' },
                    { notes: 'Crash' },
                    { notes: 'Crash' },
                    { notes: null }
                ];

                const result = raceService.aggregateDNFReasons(dnfRiders);
                expect(result).toEqual({
                    'Mechanical failure': 2,
                    'Crash': 3
                });
            });
        });
    });

    describe('updateRace', () => {
        it('should update race successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const updateData = { name: 'Updated Race Name' };
            const updatedRace = { ...mockRace, ...updateData };

            Race.findByIdAndUpdate.mockReturnValue({
                exec: jest.fn().mockResolvedValue(updatedRace)
            });

            const result = await raceService.updateRace(raceId, updateData);

            expect(Race.findByIdAndUpdate).toHaveBeenCalledWith(
                raceId,
                updateData,
                { new: true, runValidators: true }
            );
            expect(result).toBe(updatedRace);
        });
    });

    describe('deleteRace', () => {
        it('should delete race successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';

            Race.findByIdAndDelete.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            const result = await raceService.deleteRace(raceId);

            expect(Race.findByIdAndDelete).toHaveBeenCalledWith(raceId);
            expect(result).toBe(mockRace);
        });
    });

    describe('updateRiderStatus', () => {
        it('should update rider status successfully', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';
            const status = 'DNF';
            const notes = 'Mechanical failure';
            const mockResult = {
                _id: '507f1f77bcf86cd799439013',
                race: raceId,
                rider: {
                    _id: riderId,
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@example.com'
                },
                status,
                notes,
                finishTime: new Date(),
                toObject: jest.fn().mockReturnValue({
                    _id: '507f1f77bcf86cd799439013',
                    race: raceId,
                    rider: {
                        _id: riderId,
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@example.com'
                    },
                    status,
                    notes,
                    finishTime: expect.any(Date)
                })
            };

            RaceResult.findOneAndUpdate.mockReturnValue({
                populate: jest.fn().mockResolvedValue(mockResult)
            });

            const result = await raceService.updateRiderStatus(raceId, riderId, status, notes);

            expect(RaceResult.findOneAndUpdate).toHaveBeenCalledWith(
                { race: raceId, rider: riderId },
                { status, notes, finishTime: expect.any(Date) },
                { new: true }
            );
            expect(result.status).toBe(status);
            expect(mockResult.toObject).toHaveBeenCalled();
        });

        it('should throw error for invalid status', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const riderId = '507f1f77bcf86cd799439012';
            const status = 'InvalidStatus';

            await expect(raceService.updateRiderStatus(raceId, riderId, status))
                .rejects.toThrow('Invalid status');
        });
    });

    describe('analyzeRaceCompletion', () => {
        it('should analyze race completion correctly', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const mockResults = [
                { status: 'Finished', totalTime: 8000, toObject: jest.fn().mockReturnValue({ status: 'Finished', totalTime: 8000 }) },
                { status: 'Finished', totalTime: 9000, toObject: jest.fn().mockReturnValue({ status: 'Finished', totalTime: 9000 }) },
                { status: 'DNF', toObject: jest.fn().mockReturnValue({ status: 'DNF' }) },
                { status: 'DSQ', toObject: jest.fn().mockReturnValue({ status: 'DSQ' }) },
                { status: 'Registered', toObject: jest.fn().mockReturnValue({ status: 'Registered' }) }
            ];

            mockRaceResultRepository.getResultsByRace.mockResolvedValue(mockResults);
            Race.findById.mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockRace)
            });

            const result = await raceService.analyzeRaceCompletion(raceId);

            expect(result).toEqual({
                totalRegistered: 5,
                finished: 2,
                dnf: 1,
                dsq: 1,
                started: 4,
                completionRate: 50,
                averageTime: 8500,
                fastestTime: 8000,
                slowestTime: 9000
            });
        });
    });

    describe('getRacesByStatus', () => {
        it('should get races by status with pagination', async () => {
            const status = 'Open';
            const options = { page: 1, limit: 10, sort: '-createdAt' };
            const mockRaces = [mockRace];
            const totalCount = 1;

            Race.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockRaces)
            });

            Race.countDocuments.mockReturnValue({
                exec: jest.fn().mockResolvedValue(totalCount)
            });

            const result = await raceService.getRacesByStatus(status, options);

            expect(Race.find).toHaveBeenCalledWith({ status });
            expect(result).toEqual({ races: mockRaces, totalCount });
        });
    });

    describe('getUpcomingRaces', () => {
        it('should get upcoming races with pagination', async () => {
            const options = { page: 1, limit: 10, sort: 'startTime' };
            const mockRaces = [mockRace];
            const totalCount = 1;

            Race.find.mockReturnValue({
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                lean: jest.fn().mockReturnThis(),
                exec: jest.fn().mockResolvedValue(mockRaces)
            });

            Race.countDocuments.mockReturnValue({
                exec: jest.fn().mockResolvedValue(totalCount)
            });

            const result = await raceService.getUpcomingRaces(options);

            expect(Race.find).toHaveBeenCalledWith({
                startTime: { $gt: expect.any(Date) },
                status: { $in: ['Open', 'Draft'] }
            });
            expect(result).toEqual({ races: mockRaces, totalCount });
        });
    });

    describe('getRaceStats', () => {
        it('should get race statistics', async () => {
            const raceId = '507f1f77bcf86cd799439011';
            const mockResults = [
                { status: 'Registered', toObject: jest.fn().mockReturnValue({ status: 'Registered' }) },
                { status: 'Started', toObject: jest.fn().mockReturnValue({ status: 'Started' }) },
                { status: 'Finished', toObject: jest.fn().mockReturnValue({ status: 'Finished' }) },
                { status: 'DNF', toObject: jest.fn().mockReturnValue({ status: 'DNF' }) },
                { status: 'DSQ', toObject: jest.fn().mockReturnValue({ status: 'DSQ' }) }
            ];

            mockRaceResultRepository.getResultsByRace.mockResolvedValue(mockResults);

            const result = await raceService.getRaceStats(raceId);

            expect(result).toEqual({
                total: 5,
                registered: 1,
                started: 1,
                finished: 1,
                dnf: 1,
                dsq: 1
            });
        });
    });
});