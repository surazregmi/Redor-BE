import prisma from '@/config/prisma';
import type { User } from '../../../node_modules/.prisma/client/index';

type SafeUser = Omit<User, 'passwordHash'>;

export const repo = {
    getUserProfile: async (userId: bigint): Promise<SafeUser | null> => {
        return prisma.user.findUnique({
            where: { id: userId },
            omit: { passwordHash: true },
        });
    },
};
