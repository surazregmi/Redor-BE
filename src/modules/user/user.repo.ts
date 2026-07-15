import prisma from '@/config/prisma';
import type { Prisma, User } from '../../../node_modules/.prisma/client/index';

type SafeUser = Omit<User, 'passwordHash'>;

// ── Selects ───────────────────────────────────────────────────────────────────
// LIST_SELECT: lean — no createdBy join. Used for paginated list endpoints.
// DETAIL_SELECT: full — includes createdBy. Used for single-user GET.
// Keeping them separate avoids an extra join across potentially hundreds of rows.

const USER_LIST_SELECT = {
    id:            true,
    email:         true,
    firstName:     true,
    lastName:      true,
    avatarUrl:     true,
    isActive:      true,
    emailVerified: true,
    lastLoginAt:   true,
    createdAt:     true,
    updatedAt:     true,
    createdById:   true,
    userTenantRoles: {
        select: {
            tenantId:   true,
            assignedAt: true,
            role: {
                select: { id: true, name: true },
            },
        },
    },
} as const;

const USER_DETAIL_SELECT = {
    ...USER_LIST_SELECT,
    createdBy: {
        select: { id: true, firstName: true, lastName: true },
    },
} as const;

type UpdateUserInput = {
    firstName?: string;
    lastName?: string;
    avatarUrl?: string | null;
    isActive?: boolean;
};

type CreateUserInput = {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    createdById: bigint;
    tenantId: number;
    roleId: number;
};

type PaginationOptions = {
    page: number;
    limit: number;
    isActive?: boolean;
};

export const repo = {
    // ── Own profile ───────────────────────────────────────────────

    getUserProfile: async (userId: bigint): Promise<SafeUser | null> => {
        return prisma.user.findUnique({
            where: { id: userId },
            omit:  { passwordHash: true },
        });
    },

    // ── Create user ───────────────────────────────────────────────
    // Single transaction: create User + assign to tenant with role.

    createUser: async (input: CreateUserInput) => {
        const { email, passwordHash, firstName, lastName, createdById, tenantId, roleId } = input;

        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const user = await tx.user.create({
                data: { email, passwordHash, firstName, lastName, createdById },
                select: USER_DETAIL_SELECT,
            });

            await tx.userTenantRole.create({
                data: {
                    userId:     user.id,
                    tenantId,
                    roleId,
                    assignedBy: createdById,
                },
            });

            return user;
        });
    },

    // ── SUPER_ADMIN: all users across all tenants ─────────────────

    getAllUsers: async ({ page, limit, isActive }: PaginationOptions) => {
        const where = isActive !== undefined ? { isActive } : {};
        const skip  = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select:  USER_LIST_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    },

    getUserById: async (userId: bigint) => {
        return prisma.user.findUnique({
            where:  { id: userId },
            select: USER_DETAIL_SELECT,
        });
    },

    // ── ADMIN: users within their own tenant ──────────────────────

    getUsersByTenant: async (tenantId: number, { page, limit, isActive }: PaginationOptions) => {
        const where = {
            userTenantRoles: { some: { tenantId } },
            ...(isActive !== undefined ? { isActive } : {}),
        };
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select:  USER_LIST_SELECT,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.user.count({ where }),
        ]);

        return { users, total, page, limit };
    },

    getUserByIdInTenant: async (userId: bigint, tenantId: number) => {
        return prisma.user.findFirst({
            where: {
                id:              userId,
                userTenantRoles: { some: { tenantId } },
            },
            select: USER_DETAIL_SELECT,
        });
    },

    // ── Shared: update user fields ────────────────────────────────

    updateUser: async (userId: bigint, data: UpdateUserInput): Promise<SafeUser> => {
        return prisma.user.update({
            where:  { id: userId },
            data,
            omit:   { passwordHash: true },
        });
    },

    // ── Shared: soft delete (deactivate) ─────────────────────────

    deactivateUser: async (userId: bigint): Promise<void> => {
        await prisma.user.update({
            where: { id: userId },
            data:  { isActive: false },
        });
    },

    // ── Guard: check if role exists and belongs to allowed set ────

    findRoleById: async (roleId: number) => {
        return prisma.role.findUnique({
            where: { id: roleId },
            select: { id: true, name: true, tenantId: true, isSystem: true },
        });
    },

    // ── Guard: check if user holds SUPER_ADMIN system role ────────

    isSuperAdmin: async (userId: bigint): Promise<boolean> => {
        const record = await prisma.userTenantRole.findFirst({
            where: {
                userId,
                role: { name: 'SUPER_ADMIN', isSystem: true },
            },
        });
        return record !== null;
    },
};
