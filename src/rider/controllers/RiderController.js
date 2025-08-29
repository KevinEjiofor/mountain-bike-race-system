const RiderService = require('../services/RiderService');
const { validateRider, validateRiderUpdate, validateObjectId, validatePaginationQuery, validateSearchQuery } = require('../../middlewares/validateRace');
const { successResponse, errorResponse, validationErrorResponse, notFoundResponse, handleDatabaseError, asyncHandler, createPaginationInfo, paginatedResponse } = require('../../utils/respondHandler');

class RiderController {
    constructor() {
        this.riderService = new RiderService();
    }

    createRider = asyncHandler(async (req, res) => {
        const { error } = validateRider(req.body);
        if (error) {
            return validationErrorResponse(res, { error });
        }
        try {
            const rider = await this.riderService.createRider(req.body);
            return successResponse(res, { rider }, "Rider created successfully", 201);
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    getAllRiders = asyncHandler(async (req, res) => {
        try {
            const { page = 1, limit = 10, sort = '-createdAt', category, nationality } = req.query;

            const { riders, totalCount } = await this.riderService.getAllRiders({
                page: Number(page),
                limit: Number(limit),
                sort,
                filters: {
                    category: category || undefined,
                    nationality: nationality || undefined
                }
            });

            return successResponse(res, {
                riders,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    totalCount
                }
            });
        } catch (error) {
            console.error("RiderController.getAllRiders - Error:", error);
            return errorResponse(res, "Failed to fetch riders", 500);
        }
    });

    getRiderById = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.id);
        if (error) {
            return errorResponse(res, "Invalid rider ID format", 400);
        }
        try {
            const rider = await this.riderService.getRiderById(req.params.id);
            if (!rider) {
                return notFoundResponse(res, "Rider");
            }
            return successResponse(res, { rider }, "Rider fetched successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    updateRider = asyncHandler(async (req, res) => {
        const { error: idError } = validateObjectId(req.params.id);
        if (idError) {
            return errorResponse(res, "Invalid rider ID format", 400);
        }
        const { error: validationError } = validateRiderUpdate(req.body);
        if (validationError) {
            return validationErrorResponse(res, { error: validationError });
        }
        try {
            const rider = await this.riderService.updateRider(req.params.id, req.body);
            if (!rider) {
                return notFoundResponse(res, "Rider");
            }
            return successResponse(res, { rider }, "Rider updated successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    deleteRider = asyncHandler(async (req, res) => {
        const { error } = validateObjectId(req.params.id);
        if (error) {
            return errorResponse(res, "Invalid rider ID format", 400);
        }
        try {
            const rider = await this.riderService.deleteRider(req.params.id);
            if (!rider) {
                return notFoundResponse(res, "Rider");
            }
            return successResponse(res, {}, "Rider deleted successfully");
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });

    searchRiders = asyncHandler(async (req, res) => {
        const { error, value } = validateSearchQuery(req.query);
        if (error) {
            return validationErrorResponse(res, { error });
        }

        const { query, page, limit, sort } = value;

        try {
            const result = await this.riderService.searchRiders(query, {
                page,
                limit,
                sort
            });
            const paginationInfo = createPaginationInfo(page, limit, result.totalCount);
            return paginatedResponse(res, result.riders, paginationInfo, `Search results for '${query}' fetched successfully`);
        } catch (dbError) {
            return handleDatabaseError(dbError, res);
        }
    });
}

module.exports = RiderController;