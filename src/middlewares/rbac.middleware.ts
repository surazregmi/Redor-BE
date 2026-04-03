import { NextFunction, Request, Response } from 'express';
import { CustomError } from '@/utils/custom-error';

export const requirePermission = (resource: string, action: string) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.context) {
            next(new CustomError('Unauthorized', 401));
            return;
        }

        const required = `${resource}:${action}`;
        if (!req.context.permissions.includes(required)) {
            next(new CustomError('Forbidden', 403));
            return;
        }

        next();
    };
};
