const Joi = require('joi');

const raceSchema = Joi.object({
    name: Joi.string().trim().min(3).max(100).required().messages({
        'string.empty': 'Race name is required',
        'string.min': 'Race name must be at least 3 characters long',
        'string.max': 'Race name cannot exceed 100 characters'
    }),
    description: Joi.string().trim().max(500).optional().messages({
        'string.max': 'Description cannot exceed 500 characters'
    }),
    location: Joi.object({
        name: Joi.string().trim().required().messages({
            'string.empty': 'Location name is required'
        }),
        coordinates: Joi.object({
            latitude: Joi.number().min(-90).max(90).required().messages({
                'number.min': 'Latitude must be between -90 and 90',
                'number.max': 'Latitude must be between -90 and 90'
            }),
            longitude: Joi.number().min(-180).max(180).required().messages({
                'number.min': 'Longitude must be between -180 and 180',
                'number.max': 'Longitude must be between -180 and 180'
            })
        }).optional()
    }).required(),
    startTime: Joi.date().iso().greater('now').required().messages({
        'date.greater': 'Start time must be in the future',
        'date.base': 'Invalid start time format'
    }),
    endTime: Joi.date().iso().greater(Joi.ref('startTime')).optional().messages({
        'date.greater': 'End time must be after start time'
    }),
    distance: Joi.number().positive().max(1000).required().messages({
        'number.positive': 'Distance must be a positive number',
        'number.max': 'Distance cannot exceed 1000 km'
    }),
    terrain: Joi.string().valid('Road', 'Urban Road','Trail', 'Mixed', 'Track', 'Cross-Country','Desert Sand','Mountain Trail', 'Downhill').default('Road').messages({
        'any.only': 'Terrain must be one of: Road, Desert Sand, Mountain Trail, Urban Road, Trail, Mixed, Track, Cross-Country, Downhill'
    }),
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard', 'Expert').default('Medium').messages({
        'any.only': 'Difficulty must be one of: Easy, Medium, Hard, Expert'
    }),
    maxParticipants: Joi.number().integer().positive().max(10000).optional().messages({
        'number.positive': 'Max participants must be a positive number',
        'number.max': 'Max participants cannot exceed 10,000'
    }),
    entryFee: Joi.number().min(0).max(10000).optional().messages({
        'number.min': 'Entry fee cannot be negative',
        'number.max': 'Entry fee cannot exceed $10,000'
    }),
    categories: Joi.array().items(Joi.string().valid('Professional', 'Amateur', 'Youth')).min(1).default(['Amateur']).messages({
        'array.min': 'At least one category must be specified',
        'any.only': 'Categories must be one of: Professional, Amateur, Youth'
    }),
    status: Joi.string().valid('Draft', 'Open', 'Closed', 'InProgress', 'Completed', 'Cancelled').default('Draft').messages({
        'any.only': 'Status must be one of: Draft, Open, Closed, InProgress, Completed, Cancelled'
    }),
    weatherConditions: Joi.object({
        temperature: Joi.number().optional(),
        humidity: Joi.number().min(0).max(100).optional(),
        windSpeed: Joi.number().min(0).optional(),
        condition: Joi.string().optional(),
        lastUpdated: Joi.date().optional(),
        forecastDate: Joi.date().optional()
    }).optional()
});


const raceResultSchema = Joi.object({
    rider: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'Invalid rider ID format',
        'string.empty': 'Rider ID is required'
    }),
    race: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
        'string.pattern.base': 'Invalid race ID format',
        'string.empty': 'Race ID is required'
    }),
    startTime: Joi.date().iso().required().messages({
        'date.base': 'Invalid start time format'
    }),
    finishTime: Joi.date().iso().greater(Joi.ref('startTime')).when('status', {
        is: 'Finished',
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'date.greater': 'Finish time must be after start time'
    }),
    totalTime: Joi.number().positive().when('status', {
        is: 'Finished',
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'number.positive': 'Total time must be positive'
    }),
    status: Joi.string().valid('Registered', 'Started', 'Finished', 'DNF', 'DSQ').default('Registered').messages({
        'any.only': 'Status must be one of: Registered, Started, Finished, DNF, DSQ'
    }),
    position: Joi.number().integer().positive().optional().messages({
        'number.positive': 'Position must be a positive integer'
    }),
    notes: Joi.string().max(200).optional().messages({
        'string.max': 'Notes cannot exceed 200 characters'
    })
});

const riderSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(50).required().messages({
        'string.empty': 'First name is required',
        'string.min': 'First name must be at least 2 characters',
        'string.max': 'First name cannot exceed 50 characters'
    }),
    lastName: Joi.string().trim().min(2).max(50).required().messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name must be at least 2 characters',
        'string.max': 'Last name cannot exceed 50 characters'
    }),
    email: Joi.string().email().lowercase().required().messages({
        'string.email': 'Please provide a valid email address',
        'string.empty': 'Email is required'
    }),
    dateOfBirth: Joi.date().max('now').min('1900-01-01').required().messages({
        'date.max': 'Date of birth cannot be in the future',
        'date.min': 'Invalid date of birth',
        'date.base': 'Invalid date format'
    }),
    nationality: Joi.string().trim().min(2).max(50).required().messages({
        'string.empty': 'Nationality is required',
        'string.min': 'Nationality must be at least 2 characters',
        'string.max': 'Nationality cannot exceed 50 characters'
    }),
    category: Joi.string().valid('Professional', 'Amateur', 'Youth').default('Amateur').messages({
        'any.only': 'Category must be one of: Professional, Amateur, Youth'
    }),
    bikeType: Joi.string().trim().required().messages({
        'string.empty': 'Bike type is required'
    }),
    emergencyContact: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional().messages({
            'string.min': 'Emergency contact name must be at least 2 characters',
            'string.max': 'Emergency contact name cannot exceed 100 characters'
        }),
        phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().messages({
            'string.pattern.base': 'Please provide a valid phone number'
        })
    }).optional()
});

const validateRace = (data) => raceSchema.validate(data, { abortEarly: false });
const validateRaceResult = (data) => raceResultSchema.validate(data, { abortEarly: false });
const validateRider = (data) => riderSchema.validate(data, { abortEarly: false });

const validateRaceUpdate = (data) => {
    const updateSchema = raceSchema.fork(['name', 'location', 'startTime', 'distance'], (schema) => schema.optional());
    return updateSchema.validate(data, { abortEarly: false });
};

const validateRaceResultUpdate = (data) => {
    const updateSchema = raceResultSchema.fork(['rider', 'race', 'startTime'], (schema) => schema.optional());
    return updateSchema.validate(data, { abortEarly: false });
};

const validateRiderUpdate = (data) => {
    const updateSchema = riderSchema.fork(['firstName', 'lastName', 'email', 'dateOfBirth', 'nationality', 'bikeType'], (schema) => schema.optional());
    return updateSchema.validate(data, { abortEarly: false });
};

const validateSearchQuery = (query) => {
    const schema = Joi.object({
        query: Joi.string().trim().min(2).max(100).required().messages({
            'string.empty': 'Search query is required',
            'string.min': 'Search query must be at least 2 characters long',
            'string.max': 'Search query cannot exceed 100 characters'
        }),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().valid('name', 'startTime', 'distance', 'createdAt', '-name', '-startTime', '-distance', '-createdAt').default('-createdAt')
    });
    return schema.validate(query, { abortEarly: false });
};

const validateObjectId = (id) => {
    const schema = Joi.string().pattern(/^[0-9a-fA-F]{24}$/);
    return schema.validate(id);
};
const validatePaginationQuery = (query) => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        sort: Joi.string().valid('name', 'startTime', 'distance', 'createdAt', '-name', '-startTime', '-distance', '-createdAt').default('-createdAt'),
        status: Joi.string().valid('Draft', 'Open', 'Closed', 'InProgress', 'Completed', 'Cancelled').optional(),
        category: Joi.string().valid('Professional', 'Amateur', 'Youth').optional(),
        difficulty: Joi.string().valid('Easy', 'Medium', 'Hard', 'Expert').optional(),

        terrain: Joi.string().valid('Road','Urban Road', 'Trail', 'Mixed', 'Track','Desert Sand','Mountain Trail','Cross-Country', 'Downhill').optional()
    });
    return schema.validate(query, { abortEarly: false });
};

module.exports = {
    validateRace,
    validateRaceResult,
    validateRider,
    validateRaceUpdate,
    validateRaceResultUpdate,
    validateRiderUpdate,
    validatePaginationQuery,
    validateSearchQuery,
    validateObjectId,
    raceSchema,
    raceResultSchema,
    riderSchema
};
