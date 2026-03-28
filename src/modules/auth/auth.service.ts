// import { User } from '@/interfaces/user.interfaces';
import { User } from '@prisma/client';
import { validateSignIn, validateSignUp } from './auth.validator';
import repo from './auth.repo';
import { compareSync, hash } from 'bcrypt';
import { generateJWT } from '@/middlewares/jwt.service';
import { JWT_ACCESS_TOKEN_SECRET } from '@/config';
import { CustomError } from '@/utils/custom-error';

export const signUpService = async (userData: User) => {
    const { error } = validateSignUp(userData);
    if (error) {
        throw new CustomError(error.details[0].message, 400);
    }

    const findUser = await repo.findUserByEmail(userData.email);
    if (findUser) {
        throw new CustomError(`Email ${userData.email} already exists`, 409);
    }

    const hashedPassword = await hash(userData.password, 10);
    const newUserData = await repo.createUser({
        ...userData,
        password: hashedPassword,
    });

    return { user: newUserData };
};

export const signInService = async (userData: User) => {
    const { error } = validateSignIn(userData);
    if (error) {
        throw new CustomError(error.details[0].message, 400);
    }

    const user = await repo.findUserByEmail(userData.email);
    if (!user) {
        throw new CustomError('Email or password is invalid', 401);
    }

    const validPassword = compareSync(userData.password, user.password);
    if (!validPassword) {
        throw new CustomError('Email or password is invalid', 401);
    }

    const payload = {
        userId: user.id,
    };

    const accessToken = await generateJWT(
        payload,
        JWT_ACCESS_TOKEN_SECRET as string,
    );

    return { user, accessToken };
};
