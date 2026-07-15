import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { CustomError } from './custom-error';

export const errorHandler = (
    err: Error | CustomError,
    _req: Request,
    res: Response,
    _next: NextFunction,
) => {
    if (err instanceof CustomError) {
        const body: Record<string, unknown> = {
            statusCode: err.statusCode,
            message: err.message,
        };
        if (err.errors?.length) body.errors = err.errors;
        return res.status(err.statusCode).json(body);
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({ statusCode: 409, message: 'A record with this value already exists.' });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({ statusCode: 404, message: 'Record not found.' });
        }
        return res.status(400).json({ statusCode: 400, message: 'Database request error.' });
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        return res.status(400).json({ statusCode: 400, message: 'Invalid data provided.' });
    }

    return res.status(500).json({ statusCode: 500, message: 'Internal Server Error' });
};
