const Race = require('../data/models/Race');
const Rider = require('../data/models/Rider');
const RaceResultRepository = require('../data/repositories/RaceResultRepository');
const WeatherService = require('./WeatherService');

class RaceService {
    constructor() {
        this.raceResultRepository = new RaceResultRepository();
        this.weatherService = new WeatherService();
    }

    async getTop3FastestRiders(raceId) {
        return await this.raceResultRepository.getTop3FastestInRace(raceId);
    }

    async getRidersWhoDidNotFinish(raceId) {
        return await this.raceResultRepository.getRidersWhoDidNotFinish(raceId);
    }

    async getRidersNotInRace(raceId) {
        const allRiders = await Rider.find({}, '_id');
        const allRiderIds = allRiders.map(rider => rider._id);
        const nonParticipantIds = await this.raceResultRepository.getRidersNotInRace(raceId, allRiderIds);
        return await Rider.find({ _id: { $in: nonParticipantIds } });
    }

    async updateRaceWeather(raceId) {
        const race = await Race.findById(raceId);
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
        );
    }

    async generateRaceReport(raceId) {
        const race = await Race.findById(raceId);
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
                difficulty: race.difficulty,
                status: race.status,
                categories: race.categories
            },
            statistics: {
                totalParticipants: results.length,
                finishedCount: finishedResults.length,
                dnfCount: dnf.length,
                dsqCount: results.filter(r => r.status === 'DSQ').length,
                averageTime
            },
            top3Fastest: top3,
            didNotFinish: dnf,
            weatherConditions: race.weatherConditions
        };
    }

    calculateAverageTime(finishedResults) {
        if (finishedResults.length === 0) return null;
        const totalTime = finishedResults.reduce((sum, result) => sum + result.totalTime, 0);
        return Math.round(totalTime / finishedResults.length);
    }

    async createRace(raceData) {
        const race = new Race(raceData);
        return await race.save();
    }

    async getAllRaces({ page = 1, limit = 10, sort = '-createdAt', filters = {} }) {
        const query = {};
        if (filters.status) query.status = filters.status;
        if (filters.difficulty) query.difficulty = filters.difficulty;
        if (filters.category) query.categories = { $in: [filters.category] };
        const skip = (page - 1) * limit;
        const [races, totalCount] = await Promise.all([
            Race.find(query).sort(sort).skip(skip).limit(limit).lean(),
            Race.countDocuments(query)
        ]);
        return { races, totalCount };
    }

    async getRaceById(raceId) {
        return await Race.findById(raceId);
    }

    async updateRace(raceId, updateData) {
        return await Race.findByIdAndUpdate(
            raceId,
            updateData,
            { new: true, runValidators: true }
        );
    }

    async deleteRace(raceId) {
        return await Race.findByIdAndDelete(raceId);
    }

    async getRacesByStatus(status, { page = 1, limit = 10, sort = '-createdAt' }) {
        const skip = (page - 1) * limit;
        const query = { status };
        const [races, totalCount] = await Promise.all([
            Race.find(query).sort(sort).skip(skip).limit(limit).lean(),
            Race.countDocuments(query)
        ]);
        return { races, totalCount };
    }

    async getUpcomingRaces({ page = 1, limit = 10, sort = 'startTime' }) {
        const skip = (page - 1) * limit;
        const now = new Date();
        const query = {
            startTime: { $gt: now },
            status: { $in: ['Open', 'Draft'] }
        };
        const [races, totalCount] = await Promise.all([
            Race.find(query).sort(sort).skip(skip).limit(limit).lean(),
            Race.countDocuments(query)
        ]);
        return { races, totalCount };
    }

    async searchRaces(searchQuery, { page = 1, limit = 10, sort = '-createdAt' }) {
        const skip = (page - 1) * limit;
        const query = {
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { description: { $regex: searchQuery, $options: 'i' } },
                { 'location.name': { $regex: searchQuery, $options: 'i' } }
            ]
        };
        const [races, totalCount] = await Promise.all([
            Race.find(query).sort(sort).skip(skip).limit(limit).lean(),
            Race.countDocuments(query)
        ]);
        return { races, totalCount };
    }

    async getRaceParticipants(raceId) {
        return await this.raceResultRepository.getRaceParticipants(raceId);
    }

    async getRaceResults(raceId) {
        return await this.raceResultRepository.getResultsByRace(raceId);
    }

    async getRaceStats(raceId) {
        const results = await this.raceResultRepository.getResultsByRace(raceId);
        return {
            total: results.length,
            registered: results.filter(r => r.status === 'Registered').length,
            started: results.filter(r => r.status === 'Started').length,
            finished: results.filter(r => r.status === 'Finished').length,
            dnf: results.filter(r => r.status === 'DNF').length,
            dsq: results.filter(r => r.status === 'DSQ').length
        };
    }

    async canRaceBeStarted(raceId) {
        const race = await Race.findById(raceId);
        if (!race) return { canStart: false, reason: 'Race not found' };
        const now = new Date();
        const startTime = new Date(race.startTime);
        if (race.status !== 'Open') {
            return { canStart: false, reason: 'Race must be in Open status to start' };
        }
        if (startTime > now) {
            return { canStart: false, reason: 'Race start time has not arrived yet' };
        }
        const participants = await this.getRaceParticipants(raceId);
        if (participants.length === 0) {
            return { canStart: false, reason: 'No participants registered for this race' };
        }
        return { canStart: true, reason: 'Race can be started' };
    }

    async startRace(raceId) {
        const eligibility = await this.canRaceBeStarted(raceId);
        if (!eligibility.canStart) {
            throw new Error(eligibility.reason);
        }
        return await Race.findByIdAndUpdate(
            raceId,
            {
                status: 'InProgress',
                startTime: new Date()
            },
            { new: true }
        );
    }

    async finishRace(raceId) {
        const race = await Race.findById(raceId);
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
        );
    }
}

module.exports = RaceService;