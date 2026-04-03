import express from 'express';
import {
    signUpController,
    signInController,
    refreshController,
    signOutController,
} from './auth.controller';

const authRouter = express.Router();

authRouter.post('/signup', signUpController);
authRouter.post('/signin', signInController);
authRouter.post('/refresh', refreshController);
authRouter.post('/signout', signOutController);

export default authRouter;
