const BaseRepository = require('./BaseRepository');
const RaceResult = require('../models/RaceResult');

class RaceResultRepository extends BaseRepository {
    constructor() {
        super(RaceResult);
    }

    async getTop3FastestInRace(raceId) {
        return await this.model
            .find({
                race: raceId,
                status: 'Finished',
                totalTime: { $exists: true, $ne: null }
            })
            .populate('rider', 'firstName lastName email category')
            .populate('race', 'name date')
            .sort({ totalTime: 1 })
            .limit(3);
    }

    async getRidersWhoDidNotFinish(raceId) {
        return await this.model
            .find({
                race: raceId,
                status: { $in: ['DNF', 'DSQ'] }
            })
            .populate('rider', 'firstName lastName email category')
            .populate('race', 'name date');
    }

    async getRidersNotInRace(raceId, allRiderIds) {
        const participantIds = await this.model
            .find({ race: raceId })
            .distinct('rider');

        return allRiderIds.filter(riderId =>
            !participantIds.some(participantId =>
                participantId.toString() === riderId.toString()
            )
        );
    }

    async getResultsByRace(raceId) {
        return await this.model
            .find({ race: raceId })
            .populate('rider', 'firstName lastName email category')
            .populate('race', 'name date location')
            .sort({ totalTime: 1 });
    }

    async updateRacePositions(raceId) {
        const results = await this.model
            .find({ race: raceId, status: 'Finished' })
            .sort({ totalTime: 1 });

        for (let i = 0; i < results.length; i++) {
            await this.model.findByIdAndUpdate(results[i]._id, { position: i + 1 });
        }
    }
}

module.exports = RaceResultRepository;