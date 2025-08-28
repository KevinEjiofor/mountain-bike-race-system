const successResponse = (res, data = null, message = 'Success', statusCode = 200, meta = {}) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    };

    if (Object.keys(meta).length > 0) {
        response.meta = meta;
    }

    return res.status(statusCode).json(response);
};

const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, errors = []) => {
    const response = {
        success: false,
        message: typeof message === 'object' ? message.message || 'Error occurred' : message,
        timestamp: new Date().toISOString()
    };

    if (errors.length > 0) {
        response.errors = errors;
    }

    if (process.env.NODE_ENV === 'development' && typeof message === 'object' && message.stack) {
        response.stack = message.stack;
    }

    return res.status(statusCode).json(response);
};

const validationErrorResponse = (res, validationResult) => {
    const errors = validationResult.error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
    }));

    return errorResponse(res, 'Validation failed', 400, errors);
};

const notFoundResponse = (res, resource = 'Resource') => {
    return errorResponse(res, `${resource} not found`, 404);
};

const unauthorizedResponse = (res, message = 'Unauthorized access') => {
    return errorResponse(res, message, 401);
};

const forbiddenResponse = (res, message = 'Access forbidden') => {
    return errorResponse(res, message, 403);
};

const conflictResponse = (res, message = 'Resource conflict') => {
    return errorResponse(res, message, 409);
};

const paginatedResponse = (res, data, paginationInfo, message = 'Data retrieved successfully') => {
    const {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage
    } = paginationInfo;

    const meta = {
        pagination: {
            currentPage: page,
            itemsPerPage: limit,
            totalItems,
            totalPages,
            hasNextPage,
            hasPrevPage,
            nextPage,
            prevPage
        }
    };

    return successResponse(res, data, message, 200, meta);
};

const asyncHandler = (controller) => {
    return (req, res, next) => {
        Promise.resolve(controller(req, res, next)).catch(next);
    };
};

const createPaginationInfo = (page, limit, totalItems) => {
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const nextPage = hasNextPage ? page + 1 : null;
    const prevPage = hasPrevPage ? page - 1 : null;

    return {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage,
        prevPage
    };
};

const handleDatabaseError = (error, res) => {
    let message = 'Database operation failed';
    let statusCode = 500;

    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        message = `${field} already exists`;
        statusCode = 409;
    } else if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => ({
            field: err.path,
            message: err.message,
            value: err.value
        }));
        return errorResponse(res, 'Database validation failed', 400, errors);
    } else if (error.name === 'CastError') {
        message = `Invalid ${error.path}: ${error.value}`;
        statusCode = 400;
    }

    return errorResponse(res, message, statusCode);
};

const apiResponse = (res, data, message, statusCode = 200) => {
    return res.status(statusCode).json({
        success: statusCode >= 200 && statusCode < 300,
        message,
        data,
        statusCode,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    successResponse,
    errorResponse,
    validationErrorResponse,
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
    conflictResponse,
    paginatedResponse,
    asyncHandler,
    createPaginationInfo,
    handleDatabaseError,
    apiResponse
};
