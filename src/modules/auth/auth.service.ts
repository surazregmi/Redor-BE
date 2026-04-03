import { compareSync, hash } from 'bcrypt';
import { generateJWT } from '@/middlewares/jwt.service';
import { JWT_ACCESS_TOKEN_SECRET } from '@/config';
import { CustomError } from '@/utils/custom-error';
import { generateSecureToken, sha256 } from '@/utils/crypto';
import { validateOwnerSignUp, validateRefresh, validateSignIn } from './auth.validator';
import repo from './auth.repo';
import type { OwnerSignUpDto, RefreshDto, SignInDto } from '@/types/auth.types';
import type { User } from '../../../node_modules/.prisma/client/index';

type SafeUser = Omit<User, 'passwordHash'>;

const stripPasswordHash = (user: User): SafeUser => {
    const { passwordHash: _, ...safe } = user;
    return safe;
};

export const ownerSignUpService = async (dto: OwnerSignUpDto) => {
    const { error } = validateOwnerSignUp(dto);
    if (error) throw new CustomError(error.details[0].message, 400);

    const existing = await repo.findUserByEmail(dto.email);
    if (existing) throw new CustomError(`Email ${dto.email} already exists`, 409);

    const adminRole = await repo.findSystemRoleByName('ADMIN');
    if (!adminRole) {
        throw new CustomError('System roles not seeded. Please contact support.', 500);
    }

    const passwordHash = await hash(dto.password, 12);

    const { user, tenant } = await repo.createOwnerWithTenant(
        {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
        },
        { name: dto.tenantName, slug: dto.tenantSlug },
        adminRole.id,
    );

    return { user, tenant };
};

export const signInService = async (
    dto: SignInDto,
    meta: { ipAddress?: string; deviceInfo?: string },
) => {
    const { error } = validateSignIn(dto);
    if (error) throw new CustomError(error.details[0].message, 400);

    const user = await repo.findUserByEmail(dto.email);
    // Same message for both cases — prevents user enumeration
    if (!user) throw new CustomError('Email or password is invalid', 401);
    if (!user.isActive) throw new CustomError('Email or password is invalid', 401);

    const validPassword = compareSync(dto.password, user.passwordHash);
    if (!validPassword) throw new CustomError('Email or password is invalid', 401);

    // Determine tenantId: use provided or fall back to first active membership
    const tenantId: number = await (async () => {
        if (dto.tenantId) return dto.tenantId;
        const firstMembership = await repo.findFirstTenantMembership(user.id);
        if (!firstMembership) throw new CustomError('User has no tenant membership', 403);
        return firstMembership.tenantId;
    })();

    const userWithRoles = await repo.findUserWithRolesAndPermissions(user.id, tenantId);
    if (!userWithRoles || userWithRoles.userTenantRoles.length === 0) {
        throw new CustomError('No role found for this tenant', 403);
    }

    const roles = userWithRoles.userTenantRoles.map((utr) => utr.role.name);
    const permissions = [
        ...new Set(
            userWithRoles.userTenantRoles.flatMap((utr) =>
                utr.role.permissions.map(
                    (rp) => `${rp.permission.resource}:${rp.permission.action}`,
                ),
            ),
        ),
    ];

    const accessToken = generateJWT(
        { sub: user.id.toString(), tenantId, roles, permissions },
        JWT_ACCESS_TOKEN_SECRET as string,
        '15m',
    );

    const rawRefreshToken = generateSecureToken();
    const tokenHash = sha256(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await repo.createRefreshToken({
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: meta.ipAddress,
        deviceInfo: meta.deviceInfo,
    });

    // Fire-and-forget — don't block response for a non-critical update
    repo.updateLastLogin(user.id).catch(() => undefined);

    return {
        user: stripPasswordHash(user),
        accessToken,
        refreshToken: rawRefreshToken,
    };
};

export const refreshTokenService = async (dto: RefreshDto) => {
    const { error } = validateRefresh(dto);
    if (error) throw new CustomError(error.details[0].message, 400);

    const tokenHash = sha256(dto.refreshToken);
    const stored = await repo.findRefreshToken(tokenHash);

    if (!stored) throw new CustomError('Invalid refresh token', 401);
    if (stored.isRevoked) throw new CustomError('Invalid refresh token', 401);
    if (stored.expiresAt < new Date()) throw new CustomError('Refresh token expired', 401);

    // Derive tenantId from the user's first active membership
    const firstMembership = await repo.findFirstTenantMembership(stored.userId);
    if (!firstMembership) throw new CustomError('User has no tenant membership', 403);

    const tenantId = firstMembership.tenantId;

    // Load fresh roles/permissions so any role changes take effect immediately
    const userWithRoles = await repo.findUserWithRolesAndPermissions(stored.userId, tenantId);
    if (!userWithRoles || userWithRoles.userTenantRoles.length === 0) {
        throw new CustomError('No role found for this tenant', 403);
    }

    const roles = userWithRoles.userTenantRoles.map((utr) => utr.role.name);
    const permissions = [
        ...new Set(
            userWithRoles.userTenantRoles.flatMap((utr) =>
                utr.role.permissions.map(
                    (rp) => `${rp.permission.resource}:${rp.permission.action}`,
                ),
            ),
        ),
    ];

    const accessToken = generateJWT(
        { sub: firstMembership.userId.toString(), tenantId, roles, permissions },
        JWT_ACCESS_TOKEN_SECRET as string,
        '15m',
    );

    return { accessToken };
};

export const signOutService = async (dto: RefreshDto) => {
    const { error } = validateRefresh(dto);
    if (error) throw new CustomError(error.details[0].message, 400);

    const tokenHash = sha256(dto.refreshToken);
    const stored = await repo.findRefreshToken(tokenHash);

    // Idempotent — silently succeed if already revoked or not found
    if (!stored || stored.isRevoked) return;

    await repo.revokeRefreshToken(tokenHash);
};
