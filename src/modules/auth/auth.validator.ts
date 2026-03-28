import Joi from 'joi';

const options = {
    errors: {
        wrap: {
            label: '',
        },
    },
};

export const validateSignUp = (userData: any) => {
    const schema = Joi.object({
        id: Joi.number().integer().positive().optional().messages({
            'number.base': 'User ID must be a number.',
            'number.integer': 'User ID must be an integer.',
            'number.positive': 'User ID must be a positive number.',
        }),
        tenantId: Joi.number().integer().positive().required().messages({
            'number.base': 'Tenant ID must be a number.',
            'number.integer': 'Tenant ID must be an integer.',
            'number.positive': 'Tenant ID must be a positive number.',
            'any.required': 'Tenant Id is required.',
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Email format is invalid',
            'any.required': 'Email is required',
        }),

        password: Joi.string()
            .min(8)
            .pattern(
                new RegExp(
                    '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z\\d]).+$',
                ),
            )
            .required()
            .messages({
                'string.min': 'Password must have at least 8 characters.',
                'string.pattern.base':
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
                'any.required': 'Password is required.',
            }),
    });

    return schema.validate(userData, options);
};

export const validateSignIn = (userData: any) => {
    const schema = Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email format is invalid',
            'any.required': 'Email is required',
        }),
        password: Joi.string().required(),
    });

    return schema.validate(userData, options);
};
