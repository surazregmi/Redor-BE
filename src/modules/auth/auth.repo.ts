import prisma from '@/config/prisma';
import { User } from '@prisma/client';

const repo = {
    findUserByEmail: async (email: string): Promise<User | null> => {
        return await prisma.user.findUnique({ where: { email } });
    },

    createUser: async (
        userData: Omit<User, 'id' | 'createdAt' | 'lastLoginAt'>,
    ): Promise<User> => {
        return await prisma.user.create({ data: userData });
    },
};

export default repo;
