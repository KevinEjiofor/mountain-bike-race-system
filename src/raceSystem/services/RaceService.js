const Race = require('../data/models/Race');
const Rider = require('../../rider/data/models/Rider');
const RaceResult = require('../data/models/RaceResult');
const RaceResultRepository = require('../data/repositories/RaceResultRepository');
const WeatherService = require('./WeatherService');

class RaceService {
    constructor() {
        this.raceResultRepository = new RaceResultRepository();
        this.weatherService = new WeatherService();
    }

    async createRace(raceData) {
        try {
            const race = new Race(raceData);
            return await race.save();
        } catch (error) {
            console.error('RaceService.createRace - Error:', error);
            throw error;
        }
    }

    async getRaceById(raceId) {
        try {
            return await Race.findById(raceId).exec();
        } catch (error) {
            console.error('RaceService.getRaceById - Error:', error);
            throw error;
        }
    }

    async searchRaces(searchQuery, { page = 1, limit = 10, sort = '-createdAt' }) {
        try {
            const skip = (page - 1) * limit;

            const query = {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { description: { $regex: searchQuery, $options: 'i' } },
                    { 'location.name': { $regex: searchQuery, $options: 'i' } },
                    { terrain: { $regex: searchQuery, $options: 'i' } }
                ]
            };

            const [races, totalCount] = await Promise.all([
                Race.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                Race.countDocuments(query).exec()
            ]);

            return { races, totalCount };
        } catch (error) {
            console.error('RaceService.searchRaces - Error:', error);
            throw error;
        }
    }

    async updateRace(raceId, updateData) {
        try {
            return await Race.findByIdAndUpdate(
                raceId,
                updateData,
                { new: true, runValidators: true }
            ).exec();
        } catch (error) {
            console.error('RaceService.updateRace - Error:', error);
            throw error;
        }
    }

    async deleteRace(raceId) {
        try {
            return await Race.findByIdAndDelete(raceId).exec();
        } catch (error) {
            console.error('RaceService.deleteRace - Error:', error);
            throw error;
        }
    }

    async getRidersWhoDidNotFinish(raceId) {
        try {
            const dnfRiders = await this.raceResultRepository.getRidersWhoDidNotFinish(raceId);

            return {
                dnf: dnfRiders.filter(r => r.status === 'DNF'),
                dsq: dnfRiders.filter(r => r.status === 'DSQ'),
                total: dnfRiders.length,
                reasons: this.aggregateDNFReasons(dnfRiders)
            };
        } catch (error) {
            console.error('RaceService.getRidersWhoDidNotFinish - Error:', error);
            throw error;
        }
    }

    async getRidersNotInRace(raceId) {
        try {
            const race = await Race.findById(raceId).select('categories difficulty terrain').exec();
            const allRiders = await Rider.find({}, '_id firstName lastName category experience').exec();
            const allRiderIds = allRiders.map(rider => rider._id);

            const nonParticipantIds = await this.raceResultRepository.getRidersNotInRace(raceId, allRiderIds);
            const nonParticipants = await Rider.find({ _id: { $in: nonParticipantIds } }).exec();

            return nonParticipants.map(rider => ({
                ...rider.toObject(),
                eligible: this.checkRiderEligibility(rider, race),
                canRegister: this.canRiderRegister(rider, race)
            }));
        } catch (error) {
            console.error('RaceService.getRidersNotInRace - Error:', error);
            throw error;
        }
    }

    async updateRacePositions(raceId) {
        try {
            await this.raceResultRepository.updateRacePositions(raceId);
            return await this.getTop3FastestRiders(raceId);
        } catch (error) {
            console.error('RaceService.updateRacePositions - Error:', error);
            throw error;
        }
    }

    // UPDATED: Enhanced rider status management
    async updateRiderStatus(raceId, riderId, status, notes = null) {
        try {
            const validStatuses = ['Registered', 'Started', 'Finished', 'DNF', 'DSQ'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status');
            }

            const updateData = { status };
            if (notes) updateData.notes = notes;

            // For DNF/DSQ, record the time they dropped out but don't calculate total time
            if (status === 'DNF' || status === 'DSQ') {
                updateData.finishTime = new Date();
                // Don't set totalTime for DNF/DSQ
            }

            const result = await RaceResult.findOneAndUpdate(
                { race: raceId, rider: riderId },
                updateData,
                { new: true }
            ).populate('rider', 'firstName lastName email');

            if (!result) {
                throw new Error('Rider not found in this race');
            }

            return result;
        } catch (error) {
            console.error('RaceService.updateRiderStatus - Error:', error);
            throw error;
        }
    }

    // NEW: Individual rider finish (mass start, individual finish)
    async finishRider(raceId, riderId) {
        try {
            const finishTime = new Date();

            // Find the rider's race result
            const result = await RaceResult.findOne({
                race: raceId,
                rider: riderId,
                status: 'Started' // Can only finish started riders
            });

            if (!result) {
                throw new Error('Rider not found or not started yet');
            }

            // Calculate total time from race start to individual finish
            const totalTime = Math.floor((finishTime - result.startTime) / 1000);

            // Update to finished
            const updatedResult = await RaceResult.findByIdAndUpdate(
                result._id,
                {
                    status: 'Finished',
                    finishTime: finishTime,
                    totalTime: totalTime
                },
                { new: true }
            ).populate('rider', 'firstName lastName email category');

            // Auto-update race positions for all finished riders
            await this.updateRacePositions(raceId);

            return {
                ...updatedResult.toObject(),
                formattedTime: this.formatTime(totalTime),
                position: updatedResult.position
            };
        } catch (error) {
            console.error('RaceService.finishRider - Error:', error);
            throw error;
        }
    }

    // NEW: Get live race standings during race
    async getLiveStandings(raceId) {
        try {
            const [finished, started, dnf, dsq] = await Promise.all([
                RaceResult.find({ race: raceId, status: 'Finished' })
                    .populate('rider', 'firstName lastName category')
                    .sort({ totalTime: 1 }), // Fastest first
                RaceResult.find({ race: raceId, status: 'Started' })
                    .populate('rider', 'firstName lastName category'),
                RaceResult.find({ race: raceId, status: 'DNF' })
                    .populate('rider', 'firstName lastName category'),
                RaceResult.find({ race: raceId, status: 'DSQ' })
                    .populate('rider', 'firstName lastName category')
            ]);

            return {
                finished: finished.map((result, index) => ({
                    ...result.toObject(),
                    position: index + 1,
                    formattedTime: this.formatTime(result.totalTime)
                })),
                stillRacing: started.length,
                dnf: dnf.length,
                dsq: dsq.length,
                totalStarted: finished.length + started.length + dnf.length + dsq.length
            };
        } catch (error) {
            console.error('RaceService.getLiveStandings - Error:', error);
            throw error;
        }
    }

    async analyzeRaceCompletion(raceId) {
        try {
            const [allResults, race] = await Promise.all([
                this.raceResultRepository.getResultsByRace(raceId),
                Race.findById(raceId).exec()
            ]);

            const analysis = {
                totalRegistered: allResults.length,
                finished: allResults.filter(r => r.status === 'Finished').length,
                dnf: allResults.filter(r => r.status === 'DNF').length,
                dsq: allResults.filter(r => r.status === 'DSQ').length,
                started: allResults.filter(r => ['Started', 'Finished', 'DNF', 'DSQ'].includes(r.status)).length,
                completionRate: 0,
                averageTime: null,
                fastestTime: null,
                slowestTime: null
            };

            if (analysis.started > 0) {
                analysis.completionRate = Math.round((analysis.finished / analysis.started) * 100);
            }

            const finishedResults = allResults.filter(r => r.status === 'Finished' && r.totalTime);
            if (finishedResults.length > 0) {
                const times = finishedResults.map(r => r.totalTime);
                analysis.averageTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
                analysis.fastestTime = Math.min(...times);
                analysis.slowestTime = Math.max(...times);
            }

            return analysis;
        } catch (error) {
            console.error('RaceService.analyzeRaceCompletion - Error:', error);
            throw error;
        }
    }

    async updateRaceWeather(raceId) {
        try {
            const race = await Race.findById(raceId).exec();
            if (!race || !race.location.coordinates) {
                throw new Error('Race or coordinates not found');
            }

            const { latitude, longitude } = race.location.coordinates;
            const raceDate = new Date(race.startTime);
            const now = new Date();
            let weatherData;

            if (raceDate > now) {
                weatherData = await this.weatherService.getForecast(latitude, longitude, raceDate);
            } else {
                weatherData = await this.weatherService.getCurrentWeather(latitude, longitude);
            }

            return await Race.findByIdAndUpdate(
                raceId,
                { weatherConditions: weatherData },
                { new: true }
            ).exec();
        } catch (error) {
            console.error('RaceService.updateRaceWeather - Error:', error);
            throw error;
        }
    }

    // UPDATED: Enhanced top 3 with position info and time gaps
    async getTop3FastestRiders(raceId) {
        try {
            const results = await this.raceResultRepository.getTop3FastestInRace(raceId);

            return results.map((result, index) => ({
                ...result.toObject(),
                rank: index + 1,
                formattedTime: this.formatTime(result.totalTime),
                gap: index === 0 ? null : `+${this.formatTime(result.totalTime - results[0].totalTime)}`
            }));
        } catch (error) {
            console.error('RaceService.getTop3FastestRiders - Error:', error);
            throw error;
        }
    }

    async getAllRaces({ page = 1, limit = 10, sort = '-createdAt', filters = {} }) {
        try {
            const query = {};

            if (filters.status) query.status = filters.status;
            if (filters.difficulty) query.difficulty = filters.difficulty;
            if (filters.category) query.categories = { $in: [filters.category] };
            if (filters.terrain) query.terrain = filters.terrain;

            const skip = (page - 1) * limit;

            const [races, totalCount] = await Promise.all([
                Race.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                Race.countDocuments(query).exec()
            ]);

            return { races, totalCount };
        } catch (error) {
            console.error('RaceService.getAllRaces - Error:', error);
            throw error;
        }
    }

    async generateRaceReport(raceId) {
        try {
            const race = await Race.findById(raceId).exec();
            if (!race) return { race: null };

            const [results, top3, dnf] = await Promise.all([
                this.raceResultRepository.getResultsByRace(raceId),
                this.getTop3FastestRiders(raceId),
                this.getRidersWhoDidNotFinish(raceId)
            ]);

            const finishedResults = results.filter(r => r.status === 'Finished');
            const averageTime = this.calculateAverageTime(finishedResults);

            return {
                race: {
                    id: race._id,
                    name: race.name,
                    description: race.description,
                    location: race.location,
                    startTime: race.startTime,
                    endTime: race.endTime,
                    distance: race.distance,
                    terrain: race.terrain,
                    difficulty: race.difficulty,
                    status: race.status,
                    categories: race.categories
                },
                statistics: {
                    totalParticipants: results.length,
                    finishedCount: finishedResults.length,
                    dnfCount: dnf.total,
                    dsqCount: results.filter(r => r.status === 'DSQ').length,
                    averageTime
                },
                top3Fastest: top3,
                didNotFinish: dnf,
                weatherConditions: race.weatherConditions
            };
        } catch (error) {
            console.error('RaceService.generateRaceReport - Error:', error);
            throw error;
        }
    }

    calculateAverageTime(finishedResults) {
        if (finishedResults.length === 0) return null;
        const totalTime = finishedResults.reduce((sum, result) => sum + result.totalTime, 0);
        return Math.round(totalTime / finishedResults.length);
    }

    async getRacesByStatus(status, { page = 1, limit = 10, sort = '-createdAt' }) {
        try {
            const skip = (page - 1) * limit;
            const query = { status };

            const [races, totalCount] = await Promise.all([
                Race.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                Race.countDocuments(query).exec()
            ]);

            return { races, totalCount };
        } catch (error) {
            console.error('RaceService.getRacesByStatus - Error:', error);
            throw error;
        }
    }

    async getUpcomingRaces({ page = 1, limit = 10, sort = 'startTime' }) {
        try {
            const skip = (page - 1) * limit;
            const now = new Date();

            const query = {
                startTime: { $gt: now },
                status: { $in: ['Open', 'Draft'] }
            };

            const [races, totalCount] = await Promise.all([
                Race.find(query)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .exec(),
                Race.countDocuments(query).exec()
            ]);

            return { races, totalCount };
        } catch (error) {
            console.error('RaceService.getUpcomingRaces - Error:', error);
            throw error;
        }
    }

    async getRaceParticipants(raceId) {
        try {
            return await this.raceResultRepository.getResultsByRace(raceId);
        } catch (error) {
            console.error('RaceService.getRaceParticipants - Error:', error);
            throw error;
        }
    }

    async canRaceBeStarted(raceId, isManualStart = true) {
        try {
            const race = await Race.findById(raceId).exec();
            if (!race) {
                return { canStart: false, reason: 'Race not found' };
            }

            if (race.status !== 'Open') {
                return { canStart: false, reason: 'Race status must be Open to start' };
            }

            const now = new Date();

            if (isManualStart) {
                console.log('Manual start - allowing admin override');
                return { canStart: true, reason: null };
            }

            if (race.startTime && race.startTime > now) {
                const timeDiffMinutes = (race.startTime.getTime() - now.getTime()) / (1000 * 60);
                return {
                    canStart: false,
                    reason: `Race starts in ${Math.round(timeDiffMinutes)} minutes`
                };
            }

            return { canStart: true, reason: null };
        } catch (error) {
            return { canStart: false, reason: 'Error checking race eligibility' };
        }
    }

    // UPDATED: Mass start implementation - everyone starts at the same time
    async startRace(raceId) {
        try {
            const race = await Race.findById(raceId).exec();
            if (!race) {
                throw new Error('Race not found');
            }

            // Auto-transition from Draft to Open if needed
            if (race.status === 'Draft') {
                await Race.findByIdAndUpdate(
                    raceId,
                    { status: 'Open' },
                    { new: true }
                ).exec();
            }

            const eligibility = await this.canRaceBeStarted(raceId);
            if (!eligibility.canStart) {
                throw new Error(eligibility.reason);
            }

            const raceStartTime = new Date();

            // Update race status to InProgress
            const updatedRace = await Race.findByIdAndUpdate(
                raceId,
                {
                    status: 'InProgress',
                    startTime: raceStartTime
                },
                { new: true }
            ).exec();

            // MASS START: Update ALL registered riders to 'Started' with same start time
            await RaceResult.updateMany(
                {
                    race: raceId,
                    status: 'Registered'
                },
                {
                    status: 'Started',
                    startTime: raceStartTime  // Everyone gets the SAME start time
                }
            );

            // Get count of riders that started
            const startedCount = await RaceResult.countDocuments({
                race: raceId,
                status: 'Started'
            });

            return {
                race: updatedRace,
                ridersStarted: startedCount,
                massStartTime: raceStartTime
            };
        } catch (error) {
            console.error('RaceService.startRace - Error:', error);
            throw error;
        }
    }

    async getRaceResults(raceId) {
        try {
            return await this.raceResultRepository.getResultsByRace(raceId);
        } catch (error) {
            console.error('RaceService.getRaceResults - Error:', error);
            throw error;
        }
    }

    async getRaceStats(raceId) {
        try {
            const results = await this.raceResultRepository.getResultsByRace(raceId);

            return {
                total: results.length,
                registered: results.filter(r => r.status === 'Registered').length,
                started: results.filter(r => r.status === 'Started').length,
                finished: results.filter(r => r.status === 'Finished').length,
                dnf: results.filter(r => r.status === 'DNF').length,
                dsq: results.filter(r => r.status === 'DSQ').length
            };
        } catch (error) {
            console.error('RaceService.getRaceStats - Error:', error);
            throw error;
        }
    }

    formatTime(seconds) {
        if (!seconds) return null;
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    checkRiderEligibility(rider, race) {
        if (race.categories && race.categories.length > 0) {
            return race.categories.includes(rider.category);
        }
        return true;
    }

    canRiderRegister(rider, race) {
        return race.status === 'Open' && this.checkRiderEligibility(rider, race);
    }

    aggregateDNFReasons(dnfRiders) {
        const reasons = {};
        dnfRiders.forEach(rider => {
            if (rider.notes) {
                reasons[rider.notes] = (reasons[rider.notes] || 0) + 1;
            }
        });
        return reasons;
    }

    async finishRace(raceId) {
        try {
            const race = await Race.findById(raceId).exec();
            if (!race) {
                throw new Error('Race not found');
            }

            if (race.status !== 'InProgress') {
                throw new Error('Only races in progress can be finished');
            }

            return await Race.findByIdAndUpdate(
                raceId,
                {
                    status: 'Completed',
                    endTime: new Date()
                },
                { new: true }
            ).exec();
        } catch (error) {
            console.error('RaceService.finishRace - Error:', error);
            throw error;
        }
    }

    async registerParticipant(raceId, riderId) {
        try {
            const race = await Race.findById(raceId).exec();
            if (!race) {
                throw new Error('Race not found');
            }

            const rider = await Rider.findById(riderId).exec();
            if (!rider) {
                throw new Error('Rider not found');
            }

            const existingRegistration = await RaceResult.findOne({
                race: raceId,
                rider: riderId
            }).exec();

            if (existingRegistration) {
                throw new Error('Rider already registered for this race');
            }

            const registration = new RaceResult({
                race: raceId,
                rider: riderId,
                status: 'Registered'
            });

            return await registration.save();
        } catch (error) {
            console.error('RaceService.registerParticipant - Error:', error);
            throw error;
        }
    }
}

module.exports = RaceService;