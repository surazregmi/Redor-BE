import { NextFunction, Request, Response } from 'express';
import { getUserProfileService } from './user.service';

export const getUserProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        // req.context is guaranteed by authMiddleware — safe to assert
        const user = await getUserProfileService(req.context!.userId);
        res.status(200).json({ message: 'User data fetched', data: user });
    } catch (error) {
        next(error);
    }
};
