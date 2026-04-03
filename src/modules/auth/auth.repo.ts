import prisma from '@/config/prisma';
import { Prisma } from '@prisma/client';
import type { RefreshToken, Role, Tenant, User } from '../../../node_modules/.prisma/client/index';

type SafeUser = Omit<User, 'passwordHash'>;

type CreateUserInput = {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
};

type CreateTenantInput = {
    name: string;
    slug: string;
};

type CreateRefreshTokenInput = {
    userId: bigint;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    deviceInfo?: string;
};

type UserWithRolesAndPermissions = User & {
    userTenantRoles: Array<{
        role: {
            name: string;
            permissions: Array<{
                permission: {
                    resource: string;
                    action: string;
                };
            }>;
        };
    }>;
};

const repo = {
    findUserByEmail: async (email: string): Promise<User | null> => {
        return prisma.user.findUnique({ where: { email } });
    },

    findUserWithRolesAndPermissions: async (
        userId: bigint,
        tenantId: number,
    ): Promise<UserWithRolesAndPermissions | null> => {
        return prisma.user.findUnique({
            where: { id: userId },
            include: {
                userTenantRoles: {
                    where: { tenantId },
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
            },
        });
    },

    createOwnerWithTenant: async (
        userData: CreateUserInput,
        tenantData: CreateTenantInput,
        adminRoleId: number,
    ): Promise<{ user: SafeUser; tenant: Tenant }> => {
        return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const tenant = await tx.tenant.create({ data: tenantData });
            const { passwordHash: _, ...safeUser } = await tx.user.create({
                data: userData,
            });
            await tx.userTenantRole.create({
                data: {
                    userId: safeUser.id,
                    tenantId: tenant.id,
                    roleId: adminRoleId,
                },
            });
            return { user: safeUser, tenant };
        });
    },

    findFirstTenantMembership: async (userId: bigint) => {
        return prisma.userTenantRole.findFirst({ where: { userId } });
    },

    findSystemRoleByName: async (name: string): Promise<Role | null> => {
        return prisma.role.findFirst({
            where: { name, isSystem: true, tenantId: null },
        });
    },

    createRefreshToken: async (data: CreateRefreshTokenInput): Promise<RefreshToken> => {
        return prisma.refreshToken.create({
            data: {
                userId: data.userId,
                token: data.tokenHash,
                expiresAt: data.expiresAt,
                ipAddress: data.ipAddress,
                deviceInfo: data.deviceInfo,
            },
        });
    },

    findRefreshToken: async (tokenHash: string): Promise<RefreshToken | null> => {
        return prisma.refreshToken.findUnique({ where: { token: tokenHash } });
    },

    revokeRefreshToken: async (tokenHash: string): Promise<void> => {
        await prisma.refreshToken.update({
            where: { token: tokenHash },
            data: { isRevoked: true },
        });
    },

    updateLastLogin: async (userId: bigint): Promise<void> => {
        await prisma.user.update({
            where: { id: userId },
            data: { lastLoginAt: new Date() },
        });
    },
};

export default repo;
