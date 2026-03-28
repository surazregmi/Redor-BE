import prisma from '@/config/prisma';
import { User } from '@prisma/client'; // Generated types

export const repo = {
    getUserProfile: async (
        userId: number | undefined,
    ): Promise<User | null> => {
        if (!userId) return null;
        return await prisma.user.findUnique({ where: { id: userId } });
    },
};
