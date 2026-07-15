import { NextFunction, Request, Response } from 'express';
import {
    getUserProfileService,
    createUserService,
    listUsersService,
    getUserByIdService,
    updateUserService,
    deactivateUserService,
} from './user.service';
import type { CreateUserDto, ListUsersQuery } from '@/types/auth.types';

export const getUserProfileController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const user = await getUserProfileService(req.context!.userId);
        res.status(200).json({ message: 'User data fetched', data: user });
    } catch (error) {
        next(error);
    }
};

export const createUserController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const user = await createUserService(req.body as CreateUserDto, req.context!);
        res.status(201).json({ message: 'User created', data: user });
    } catch (error) {
        next(error);
    }
};

export const listUsersController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        // isActive comes from query string as string — coerce to boolean
        const rawQuery = req.query as Record<string, string | undefined>;
        const query: ListUsersQuery = {
            page:     rawQuery['page']  ? Number(rawQuery['page'])  : undefined,
            limit:    rawQuery['limit'] ? Number(rawQuery['limit']) : undefined,
            isActive: rawQuery['isActive'] !== undefined
                ? rawQuery['isActive'] === 'true'
                : undefined,
        };
        const result = await listUsersService(query, req.context!);
        res.status(200).json({ message: 'Users fetched', data: result });
    } catch (error) {
        next(error);
    }
};

export const getUserByIdController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const targetUserId = BigInt(req.params['userId'] as string);
        const user = await getUserByIdService(targetUserId, req.context!);
        res.status(200).json({ message: 'User fetched', data: user });
    } catch (error) {
        next(error);
    }
};

export const updateUserController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const targetUserId = BigInt(req.params['userId'] as string);
        const user = await updateUserService(targetUserId, req.body, req.context!);
        res.status(200).json({ message: 'User updated', data: user });
    } catch (error) {
        next(error);
    }
};

export const deactivateUserController = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const targetUserId = BigInt(req.params['userId'] as string);
        await deactivateUserService(targetUserId, req.context!);
        res.status(200).json({ message: 'User deactivated' });
    } catch (error) {
        next(error);
    }
};
