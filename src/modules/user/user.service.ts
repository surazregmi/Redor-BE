import { repo } from './user.repo';
import { CustomError } from '@/utils/custom-error';

export const getUserProfileService = async (userId: bigint) => {
    const user = await repo.getUserProfile(userId);
    if (!user) throw new CustomError('User not found', 404);
    return user;
};
