import Joi from 'joi';

const options = {
    errors: {
        wrap: {
            label: '',
        },
    },
};

const passwordSchema = Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$'))
    .required()
    .messages({
        'string.min': 'Password must have at least 8 characters.',
        'string.pattern.base':
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
        'any.required': 'Password is required.',
    });

export const validateOwnerSignUp = (data: unknown) => {
    const schema = Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email format is invalid.',
            'any.required': 'Email is required.',
        }),
        password: passwordSchema,
        firstName: Joi.string().min(1).max(100).required().messages({
            'string.min': 'First name cannot be empty.',
            'string.max': 'First name cannot exceed 100 characters.',
            'any.required': 'First name is required.',
        }),
        lastName: Joi.string().min(1).max(100).required().messages({
            'string.min': 'Last name cannot be empty.',
            'string.max': 'Last name cannot exceed 100 characters.',
            'any.required': 'Last name is required.',
        }),
        tenantName: Joi.string().min(2).max(100).required().messages({
            'string.min': 'Business name must be at least 2 characters.',
            'string.max': 'Business name cannot exceed 100 characters.',
            'any.required': 'Business name is required.',
        }),
        tenantSlug: Joi.string()
            .min(2)
            .max(50)
            .pattern(/^[a-z0-9-]+$/)
            .required()
            .messages({
                'string.min': 'Slug must be at least 2 characters.',
                'string.max': 'Slug cannot exceed 50 characters.',
                'string.pattern.base':
                    'Slug may only contain lowercase letters, numbers, and hyphens.',
                'any.required': 'Slug is required.',
            }),
    });

    return schema.validate(data, options);
};

export const validateSignIn = (data: unknown) => {
    const schema = Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email format is invalid.',
            'any.required': 'Email is required.',
        }),
        password: Joi.string().required().messages({
            'any.required': 'Password is required.',
        }),
        tenantId: Joi.number().integer().positive().optional(),
    });

    return schema.validate(data, options);
};

export const validateRefresh = (data: unknown) => {
    const schema = Joi.object({
        refreshToken: Joi.string().min(64).required().messages({
            'string.min': 'Invalid refresh token.',
            'any.required': 'Refresh token is required.',
        }),
    });

    return schema.validate(data, options);
};
