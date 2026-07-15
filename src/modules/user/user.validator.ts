import Joi from 'joi';

const options = {
    errors: {
        wrap: {
            label: '',
        },
    },
};

export const validateCreateUser = (data: unknown) => {
    const schema = Joi.object({
        email:     Joi.string().email().required(),
        password:  Joi.string().min(8).max(128).required(),
        firstName: Joi.string().min(1).max(100).required(),
        lastName:  Joi.string().min(1).max(100).required(),
        tenantId:  Joi.number().integer().positive().optional(), // SUPER_ADMIN only
        roleId:    Joi.number().integer().positive().required(),
    });

    return schema.validate(data, options);
};

export const validateUpdateUser = (data: unknown) => {
    const schema = Joi.object({
        email:     Joi.string().email().optional(),
        firstName: Joi.string().min(1).max(100).optional(),
        lastName:  Joi.string().min(1).max(100).optional(),
        avatarUrl: Joi.string().uri().optional().allow(null, ''),
        isActive:  Joi.boolean().optional(),

    }).min(1); // at least one field must be provided

    return schema.validate(data, options);
};

export const validateListUsersQuery = (data: unknown) => {
    const schema = Joi.object({
        page:     Joi.number().integer().min(1).default(1),
        limit:    Joi.number().integer().min(1).max(100).default(20),
        isActive: Joi.boolean().optional(),
    });

    return schema.validate(data, options);
};
