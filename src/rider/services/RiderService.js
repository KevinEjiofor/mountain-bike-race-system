const Rider = require('../data/models/Rider');
const BaseRepository = require('../data/repositories/BaseRepository');

class RiderService {
    constructor() {
        this.riderRepository = new BaseRepository(Rider);
    }

    async createRider(riderData) {
        return await this.riderRepository.create(riderData);
    }

    async getAllRiders({ page = 1, limit = 10, sort = '-createdAt', filters = {} }) {
        const query = {};

        if (filters.category) query.category = filters.category;
        if (filters.nationality) query.nationality = { $regex: filters.nationality, $options: 'i' };

        const riders = await this.riderRepository.findAll(query, { page, limit, sort });
        const totalCount = await this.riderRepository.count(query);

        return { riders, totalCount };
    }

    async getRiderById(riderId) {
        return await this.riderRepository.findById(riderId);
    }

    async updateRider(riderId, updateData) {
        return await this.riderRepository.update(riderId, updateData);
    }

    async deleteRider(riderId) {
        return await this.riderRepository.delete(riderId);
    }

    async searchRiders(searchQuery, { page = 1, limit = 10, sort = '-createdAt' }) {
        const query = {
            $or: [
                { firstName: { $regex: searchQuery, $options: 'i' } },
                { lastName: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } },
                { nationality: { $regex: searchQuery, $options: 'i' } }
            ]
        };

        const riders = await this.riderRepository.findAll(query, { page, limit, sort });
        const totalCount = await this.riderRepository.count(query);

        return { riders, totalCount };
    }
}

module.exports = RiderService;
