const RaceService = require('../services/RaceService');
const {
    validateRace,
    validateRaceUpdate,
    validatePaginationQuery,
    validateObjectId
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

    createRace = asyncHandler(async (req, res) => {
        const { error } = validateRace(req.body);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        try {
            const race = await this.raceService.createRace(req.body);
            return successResponse(res, race, "Race created successfully", 201);
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getAllRaces = asyncHandler(async (req, res) => {
        const { error, value } = validatePaginationQuery(req.query);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        const { page, limit, sort, status, category, difficulty } = value;
        try {
            const result = await this.raceService.getAllRaces({
                page,
                limit,
                sort,
                filters: { status, category, difficulty }
            });
            const paginationInfo = createPaginationInfo(page, limit, result.totalCount);
            return paginatedResponse(res, result.races, paginationInfo, "Races fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getRaceById = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.id);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const race = await this.raceService.getRaceById(req.params.id);
            if (!race) {
                return notFoundResponse(res, "Race");
            }
            return successResponse(res, race, "Race fetched successfully");
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
            return successResponse(res, race, "Race updated successfully");
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
            return successResponse(res, null, "Race deleted successfully");
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
            return successResponse(res, topRiders, "Top 3 fastest riders fetched successfully");
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
            return successResponse(res, dnfRiders, "Riders who did not finish fetched successfully");
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
            return successResponse(res, nonParticipants, "Non-participating riders fetched successfully");
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
            return successResponse(res, updatedRace.weatherConditions, "Weather conditions updated successfully");
        } catch (error) {
            if (error.message === 'Race or coordinates not found') {
                return notFoundResponse(res, "Race or coordinates");
            }
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
            return successResponse(res, report, "Race report generated successfully");
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
            return successResponse(res, participants, "Race participants fetched successfully");
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
            return successResponse(res, results, "Race results fetched successfully");
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
            return paginatedResponse(res, result.races, paginationInfo, `Races with status '${status}' fetched successfully`);
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
            return paginatedResponse(res, result.races, paginationInfo, "Upcoming races fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    searchRaces = asyncHandler(async (req, res) => {
        const { query } = req.query;
        if (!query || query.trim().length < 2) {
            return errorResponse(res, "Search query must be at least 2 characters long", 400);
        }
        const { error, value } = validatePaginationQuery(req.query);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        const { page, limit, sort } = value;
        try {
            const result = await this.raceService.searchRaces(query, {
                page,
                limit,
                sort
            });
            const paginationInfo = createPaginationInfo(page, limit, result.totalCount);
            return paginatedResponse(res, result.races, paginationInfo, `Search results for '${query}' fetched successfully`);
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    startRace = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const race = await this.raceService.startRace(req.params.raceId);
            return successResponse(res, race, "Race started successfully");
        } catch (error) {
            return errorResponse(res, error.message, 400);
        }
    });

    finishRace = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.raceId);
        if (error) {
            return errorResponse(res, "Invalid race ID format", 400);
        }
        try {
            const race = await this.raceService.finishRace(req.params.raceId);
            return successResponse(res, race, "Race finished successfully");
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
            return successResponse(res, stats, "Race statistics fetched successfully");
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
            return successResponse(res, eligibility, "Race eligibility checked successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });
}

module.exports = RaceController;
