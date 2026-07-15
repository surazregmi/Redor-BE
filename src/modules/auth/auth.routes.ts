import express from 'express';
import {
    signUpController,
    signInController,
    refreshController,
    signOutController,
} from './auth.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requirePermission } from '@/middlewares/rbac.middleware';

const authRouter = express.Router();

// SUPER_ADMIN only — creates a new tenant + its first admin user
authRouter.post('/signup',  authMiddleware, requirePermission('tenants', 'create'), signUpController);

authRouter.post('/signin',  signInController);
authRouter.post('/refresh', refreshController);
authRouter.post('/signout', signOutController);

export default authRouter;
