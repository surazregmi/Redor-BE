import { NextFunction, Request, Response } from 'express';
import {
    ownerSignUpService,
    signInService,
    refreshTokenService,
    signOutService,
} from './auth.service';

export const signUpController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const response = await ownerSignUpService(req.body);
        res.status(201).json({
            message: 'Successfully signed up',
            data: response,
        });
    } catch (error) {
        next(error);
    }
};

export const signInController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const meta = {
            ipAddress: req.ip,
            deviceInfo: req.get('User-Agent'),
        };
        const response = await signInService(req.body, meta);
        res.status(200).json({
            message: 'Successfully signed in',
            data: response,
        });
    } catch (error) {
        next(error);
    }
};

export const refreshController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const response = await refreshTokenService(req.body);
        res.status(200).json({
            message: 'Token refreshed',
            data: response,
        });
    } catch (error) {
        next(error);
    }
};

export const signOutController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        await signOutService(req.body);
        res.status(200).json({ message: 'Signed out successfully' });
    } catch (error) {
        next(error);
    }
};
