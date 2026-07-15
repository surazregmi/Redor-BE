import { hash } from 'bcrypt';
import { repo } from './user.repo';
import { CustomError } from '@/utils/custom-error';
import { validateCreateUser, validateUpdateUser, validateListUsersQuery } from './user.validator';
import type { AuthContext, CreateUserDto, ListUsersQuery } from '@/types/auth.types';

export const getUserProfileService = async (userId: bigint) => {
    const user = await repo.getUserProfile(userId);
    if (!user) throw new CustomError('User not found', 404);
    return user;
};

// ── Create user ───────────────────────────────────────────────────────────────

export const createUserService = async (dto: CreateUserDto, context: AuthContext) => {
    const { error, value } = validateCreateUser(dto);
    if (error) throw new CustomError('Validation failed', 400, error.details.map((d) => d.message));

    // Resolve which tenant this user will belong to
    const isSuperAdmin = context.roles.includes('SUPER_ADMIN');
    const isAdmin      = context.roles.includes('ADMIN');

    if (!isSuperAdmin && !isAdmin) {
        throw new CustomError('Forbidden', 403);
    }

    // ADMIN can only create users in their own tenant — ignore any tenantId in body
    const tenantId: number = isSuperAdmin
        ? (value.tenantId ?? context.tenantId)
        : context.tenantId;

    // Validate the target role exists
    const role = await repo.findRoleById(value.roleId);
    if (!role) throw new CustomError('Role not found', 404);

    // ADMIN cannot assign SUPER_ADMIN role — hard guard
    if (!isSuperAdmin && role.name === 'SUPER_ADMIN') {
        throw new CustomError('Cannot assign SUPER_ADMIN role', 403);
    }

    // Role must belong to this tenant or be a system role (tenantId null)
    if (role.tenantId !== null && role.tenantId !== tenantId) {
        throw new CustomError('Role does not belong to this tenant', 400);
    }

    // bcrypt BEFORE the transaction — never hold a DB connection during CPU work
    const passwordHash = await hash(value.password, 12);

    const user = await repo.createUser({
        email:       value.email,
        passwordHash,
        firstName:   value.firstName,
        lastName:    value.lastName,
        createdById: context.userId,
        tenantId,
        roleId:      value.roleId,
    });

    return user;
};

// ── List users ────────────────────────────────────────────────────────────────

export const listUsersService = async (query: ListUsersQuery, context: AuthContext) => {
    const { error, value } = validateListUsersQuery(query);
    if (error) throw new CustomError('Validation failed', 400, error.details.map((d) => d.message));

    const pagination = { page: value.page, limit: value.limit, isActive: value.isActive };

    if (context.roles.includes('SUPER_ADMIN')) {
        return repo.getAllUsers(pagination);
    }
    if (context.roles.includes('ADMIN')) {
        return repo.getUsersByTenant(context.tenantId, pagination);
    }
    throw new CustomError('Forbidden', 403);
};

// ── Get user by ID ────────────────────────────────────────────────────────────

export const getUserByIdService = async (targetUserId: bigint, context: AuthContext) => {
    if (context.roles.includes('SUPER_ADMIN')) {
        const user = await repo.getUserById(targetUserId);
        if (!user) throw new CustomError('User not found', 404);
        return user;
    }
    if (context.roles.includes('ADMIN')) {
        const user = await repo.getUserByIdInTenant(targetUserId, context.tenantId);
        if (!user) throw new CustomError('User not found', 404);
        return user;
    }
    throw new CustomError('Forbidden', 403);
};

// ── Update user ───────────────────────────────────────────────────────────────

export const updateUserService = async (
    targetUserId: bigint,
    dto: unknown,
    context: AuthContext,
) => {
    const { error, value } = validateUpdateUser(dto);
    if (error) throw new CustomError('Validation failed', 400, error.details.map((d) => d.message));

    if (context.roles.includes('SUPER_ADMIN')) {
        return repo.updateUser(targetUserId, value);
    }

    if (context.roles.includes('ADMIN')) {
        const exists = await repo.getUserByIdInTenant(targetUserId, context.tenantId);
        if (!exists) throw new CustomError('User not found', 404);
        return repo.updateUser(targetUserId, value);
    }

    throw new CustomError('Forbidden', 403);
};

// ── Deactivate user (soft delete) ─────────────────────────────────────────────

export const deactivateUserService = async (targetUserId: bigint, context: AuthContext) => {
    // Block deactivating any SUPER_ADMIN — checked before role scoping
    const targetIsSuperAdmin = await repo.isSuperAdmin(targetUserId);
    if (targetIsSuperAdmin) {
        throw new CustomError('Super Admin users cannot be deactivated', 403);
    }

    if (context.roles.includes('SUPER_ADMIN')) {
        const user = await repo.getUserById(targetUserId);
        if (!user) throw new CustomError('User not found', 404);
        await repo.deactivateUser(targetUserId);
        return;
    }

    if (context.roles.includes('ADMIN')) {
        const user = await repo.getUserByIdInTenant(targetUserId, context.tenantId);
        if (!user) throw new CustomError('User not found', 404);
        await repo.deactivateUser(targetUserId);
        return;
    }

    throw new CustomError('Forbidden', 403);
};
