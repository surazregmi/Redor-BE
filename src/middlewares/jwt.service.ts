import jwt from 'jsonwebtoken';
import { JwtAccessPayload } from '@/types/auth.types';

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
        throw new Error(error.message);
    }
};
