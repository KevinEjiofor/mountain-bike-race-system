const RaceService = require('../services/RaceService');
const {
    validateRace,
    validateRaceUpdate,
    validatePaginationQuery,
    validateObjectId,
    validateSearchQuery
} = require('../../middlewares/validateRace');
const {
    successResponse,
    errorResponse,
    validationErrorResponse,
    notFoundResponse,
    handleDatabaseError,
    asyncHandler,
    createPaginationInfo,
    paginatedResponse
} = require('../../utils/respondHandler');

class RaceController {

    constructor() {
        this.raceService = new RaceService();
    }

    getAdminInfo(req) {
        if (!req.admin) return {};
        const { email, firstName, lastName } = req.admin;
        return { email, firstName, lastName };
    }

    createRace = asyncHandler(async (req, res) => {
        const { error } = validateRace(req.body);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        try {
            const race = await this.raceService.createRace(req.body);
            return successResponse(res, { race, admin: this.getAdminInfo(req) }, "Race created successfully", 201);
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });



    getRaceById = asyncHandler(async (req, res) => {
        const raceId = req.params.id;

        if (!raceId) {
            return errorResponse(res, "Race ID is required", 400);
        }

        const { error } = validateObjectId(raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }

        try {
            const race = await this.raceService.getRaceById(raceId);
            if (!race) {
                return notFoundResponse(res, "Race");
            }
            return successResponse(res, { race, admin: this.getAdminInfo(req) }, "Race fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    updateRace = asyncHandler(async (req, res) => {
        const { error: idError } = validateObjectId(req.params.id);
        if (idError) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        const { error: validationError } = validateRaceUpdate(req.body);
        if (validationError) {
            return validationErrorResponse(res, { error: validationError });
        }
        try {
            const race = await this.raceService.updateRace(req.params.id, req.body);
            if (!race) {
                return notFoundResponse(res, "Race");
            }
            return successResponse(res, { race, admin: this.getAdminInfo(req) }, "Race updated successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    deleteRace = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.id);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const race = await this.raceService.deleteRace(req.params.id);
            if (!race) {
                return notFoundResponse(res, "Race");
            }
            return successResponse(res, { admin: this.getAdminInfo(req) }, "Race deleted successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getTop3FastestRiders = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const topRiders = await this.raceService.getTop3FastestRiders(req.params.raceId);
            return successResponse(res, { topRiders, admin: this.getAdminInfo(req) }, "Top 3 fastest riders fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getRidersWhoDidNotFinish = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const dnfRiders = await this.raceService.getRidersWhoDidNotFinish(req.params.raceId);
            return successResponse(res, { dnfRiders, admin: this.getAdminInfo(req) }, "Riders who did not finish fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getRidersNotInRace = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const nonParticipants = await this.raceService.getRidersNotInRace(req.params.raceId);
            return successResponse(res, { nonParticipants, admin: this.getAdminInfo(req) }, "Non-participating riders fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    updateWeatherConditions = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const updatedRace = await this.raceService.updateRaceWeather(req.params.raceId);
            if (!updatedRace) {
                return notFoundResponse(res, "Race");
            }
            return successResponse(res, { weatherConditions: updatedRace.weatherConditions, admin: this.getAdminInfo(req) }, "Weather conditions updated successfully");
        } catch (error) {
            if (error.message === 'Race or coordinates not found') {
                return notFoundResponse(res, "Race or coordinates");
            }
            return handleDatabaseError(error, res);
        }
    });
    finishRider = asyncHandler(async (req, res) => {
        const { raceId, riderId } = req.params;
        try {
            const result = await this.raceService.finishRider(raceId, riderId);
            return successResponse(res, { result }, "Rider finished successfully");
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    });

    getLiveStandings = asyncHandler(async (req, res) => {
        const { raceId } = req.params;
        try {
            const standings = await this.raceService.getLiveStandings(raceId);
            return successResponse(res, { standings }, "Live standings fetched successfully");
        } catch (error) {
            return handleDatabaseError(error, res);
        }
    });
    getRaceReport = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const report = await this.raceService.generateRaceReport(req.params.raceId);
            if (!report.race) {
                return notFoundResponse(res, "Race");
            }
            return successResponse(res, { report, admin: this.getAdminInfo(req) }, "Race report generated successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getRaceParticipants = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const participants = await this.raceService.getRaceParticipants(req.params.raceId);
            return successResponse(res, { participants, admin: this.getAdminInfo(req) }, "Race participants fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getRaceResults = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const results = await this.raceService.getRaceResults(req.params.raceId);
            return successResponse(res, { results, admin: this.getAdminInfo(req) }, "Race results fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getRacesByStatus = asyncHandler(async (req, res) => {
        const { status } = req.params;
        const validStatuses = ['Draft', 'Open', 'Closed', 'InProgress', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return errorResponse(res, "Invalid status. Must be one of: " + validStatuses.join(', '), 400);
        }
        const { error, value } = validatePaginationQuery(req.query);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        const { page, limit, sort } = value;
        try {
            const result = await this.raceService.getRacesByStatus(status, {
                page,
                limit,
                sort
            });
            const paginationInfo = createPaginationInfo(page, limit, result.totalCount);
            return paginatedResponse(res, result.races, paginationInfo, `Races with status '${status}' fetched successfully`, { admin: this.getAdminInfo(req) });
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getUpcomingRaces = asyncHandler(async (req, res) => {
        const { error, value } = validatePaginationQuery(req.query);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        const { page, limit, sort } = value;
        try {
            const result = await this.raceService.getUpcomingRaces({
                page,
                limit,
                sort
            });
            const paginationInfo = createPaginationInfo(page, limit, result.totalCount);
            return paginatedResponse(res, result.races, paginationInfo, "Upcoming races fetched successfully", { admin: this.getAdminInfo(req) });
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    searchRaces = asyncHandler(async (req, res) => {
        const { error, value } = validateSearchQuery(req.query);
        if (error) {
            return validationErrorResponse(res, { error });
        }

        const { query, page, limit, sort } = value;

        try {
            const result = await this.raceService.searchRaces(query, {
                page,
                limit,
                sort
            });
            const paginationInfo = createPaginationInfo(page, limit, result.totalCount);
            return paginatedResponse(res, result.races, paginationInfo, `Search results for '${query}' fetched successfully`, { admin: this.getAdminInfo(req) });
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });
    getAllRaces = asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 10, sort = '-createdAt', status, difficulty, category, terrain } = req.query;

            const { races, totalCount } = await this.raceService.getAllRaces({
                page: Number(page),
                limit: Number(limit),
                sort,
                filters: {
                    status: status || undefined,
                    difficulty: difficulty || undefined,
                    category: category || undefined,
                    // ADD TERRAIN FILTER
                    terrain: terrain || undefined
                }
            });

            return successResponse(res, {
                races,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    totalCount
                }
            });
        } catch (error) {
            console.error("RaceController.getAllRaces - Error:", error);
            return errorResponse(res, "Failed to fetch races", 500);
        }
    });

    startRace = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const race = await this.raceService.startRace(req.params.raceId);
            return successResponse(res, { race, admin: this.getAdminInfo(req) }, "Race started successfully");
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    });

    updateRaceStatus = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }

        const { status } = req.body;
        const validStatuses = ['Draft', 'Open', 'Closed', 'InProgress', 'Completed', 'Cancelled'];

        if (!validStatuses.includes(status)) {
            return errorResponse(res, "Invalid status", 400);
        }

        try {
            const race = await this.raceService.updateRace(req.params.raceId, { status });
            return successResponse(res, { race, admin: this.getAdminInfo(req) }, "Race status updated successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    finishRace = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const race = await this.raceService.finishRace(req.params.raceId);
            return successResponse(res, { race, admin: this.getAdminInfo(req) }, "Race finished successfully");
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    });

    getRaceStats = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const stats = await this.raceService.getRaceStats(req.params.raceId);
            return successResponse(res, { stats, admin: this.getAdminInfo(req) }, "Race statistics fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    checkRaceEligibility = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const eligibility = await this.raceService.canRaceBeStarted(req.params.raceId);
            return successResponse(res, { eligibility, admin: this.getAdminInfo(req) }, "Race eligibility checked successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    registerParticipant = asyncHandler(async (req, res) => {
        const { error: raceIdError } = validateObjectId(req.params.raceId);
        const { error: riderIdError } = validateObjectId(req.body.riderId);

        if (raceIdError || riderIdError) {
            return errorResponse(res, "Invalid ID format", 400);
        }

        try {
            const registration = await this.raceService.registerParticipant(
                req.params.raceId,
                req.body.riderId
            );
            return successResponse(res, { registration }, "Participant registered successfully", 201);
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    });
}

module.exports = RaceController;