export interface JwtAccessPayload {
    sub: string; // User BigInt id serialized as string
    tenantId: number;
    roles: string[]; // e.g. ["TENANT_ADMIN"]
    permissions: string[]; // e.g. ["menu:read", "orders:write"]
    iat?: number;
    exp?: number;
}

export interface AuthContext {
    userId: bigint; // parsed back from sub — matches User.id BigInt
    tenantId: number; // matches Tenant.id Int
    roles: string[];
    permissions: string[];
}

export interface OwnerSignUpDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName: string;
    tenantSlug: string;
}

export interface SignInDto {
    email: string;
    password: string;
    tenantId?: number;
}

export interface RefreshDto {
    refreshToken: string;
}

export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantId?: number; // SUPER_ADMIN provides this; ADMIN uses context.tenantId
    roleId: number;
}

export interface ListUsersQuery {
    page?: number;     // default 1
    limit?: number;    // default 20, max 100
    isActive?: boolean; // default: undefined (return all)
}
