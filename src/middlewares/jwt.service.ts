import jwt from 'jsonwebtoken';
import { JwtAccessPayload } from '@/types/auth.types';
import { CustomError } from '@/utils/custom-error';

export const generateJWT = (
    payload: JwtAccessPayload,
    secretKey: string,
    expiresIn: string | number,
): string => {
    return jwt.sign(payload, secretKey, { expiresIn } as jwt.SignOptions);
};

export const verifyJWT = async (
    token: string, // expects a clean token — no "Bearer " prefix
    secretKey: string,
): Promise<JwtAccessPayload> => {
    try {
        const data = jwt.verify(token, secretKey);

        if (typeof data === 'string') {
            throw new Error('Invalid token payload');
        }

        return data as JwtAccessPayload;
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
            throw new CustomError('Token has expired', 401);
        }
        throw new CustomError('Invalid token', 401);
    }
};
