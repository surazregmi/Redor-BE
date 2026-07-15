import express from 'express';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requirePermission } from '@/middlewares/rbac.middleware';
import {
    getUserProfileController,
    createUserController,
    listUsersController,
    getUserByIdController,
    updateUserController,
    deactivateUserController,
} from './user.controller';

const userRouter = express.Router();

// ── Own profile (any authenticated user) ─────────────────────────────────────
userRouter.get('/profile', authMiddleware, getUserProfileController);

// ── User management (SUPER_ADMIN + ADMIN, scoped in service layer) ────────────
userRouter.post('/',          authMiddleware, requirePermission('users', 'create'), createUserController);
userRouter.get('/',           authMiddleware, requirePermission('users', 'read'),   listUsersController);
userRouter.get('/:userId',    authMiddleware, requirePermission('users', 'read'),   getUserByIdController);
userRouter.patch('/:userId',  authMiddleware, requirePermission('users', 'manage'), updateUserController);
userRouter.delete('/:userId', authMiddleware, requirePermission('users', 'manage'), deactivateUserController);

export default userRouter;
