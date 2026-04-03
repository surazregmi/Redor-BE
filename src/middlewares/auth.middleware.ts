import { CustomError } from '@/utils/custom-error';
import { verifyJWT } from './jwt.service';
import { JWT_ACCESS_TOKEN_SECRET } from '@/config';
import { NextFunction, Request, Response } from 'express';

export const authMiddleware = async (
    req: Request,
    _res: Response,
    next: NextFunction,
): Promise<void> => {
    // Allow CORS preflight through — auth headers are not sent on OPTIONS
    if (req.method === 'OPTIONS') {
        return next();
    }

    try {
        const header =
            req.header('Authorization') || req.header('authorization');

        if (!header) {
            throw new CustomError('Authorization header missing', 401);
        }

        const token = header.replace(/^Bearer\s+/i, '');
        const payload = await verifyJWT(token, JWT_ACCESS_TOKEN_SECRET as string);

        req.context = {
            userId: BigInt(payload.sub),
            tenantId: payload.tenantId,
            roles: payload.roles,
            permissions: payload.permissions,
        };

        next();
    } catch (error) {
        next(error);
    }
};
