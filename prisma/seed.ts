/**
 * Redor — Database Seed
 *
 * Idempotent: safe to re-run at any time. Uses upsert throughout.
 * Runs inside a single transaction — all-or-nothing.
 *
 * Seeds:
 *   1. Permission catalog  (resource:action pairs — your product features)
 *   2. System roles        (generic — reusable across any product)
 *   3. Role → Permission   (default assignments per system role)
 *   4. Platform tenant     (the Redor SaaS itself)
 *   5. Super admin user    (you — credentials from env)
 *
 * Run:  npx prisma db seed
 *
 * Required env vars:
 *   SUPER_ADMIN_EMAIL      your login email
 *   SUPER_ADMIN_PASSWORD   your login password (min 8 chars)
 *
 * Optional env vars:
 *   SUPER_ADMIN_FIRST_NAME  (default: "Super")
 *   SUPER_ADMIN_LAST_NAME   (default: "Admin")
 */

import { type Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hash } from 'bcrypt';
import { config } from 'dotenv';

// Load env vars — seed runs outside the Express app so dotenv isn't pre-loaded
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// ─────────────────────────────────────────────────────────────────
// CLIENT SETUP
// Uses pooled DATABASE_URL (not DIRECT_URL) — seed is not a migration.
// ─────────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set in your environment file.');
    process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────
// 1. PERMISSION CATALOG
//
// These are the features your product exposes.
// Super Admin manages this catalog live via API — no redeploy needed.
// Tenant Admins assign these to custom roles for their team.
//
// To add a new feature later: POST /api/admin/permissions
// ─────────────────────────────────────────────────────────────────

type PermissionDef = {
    resource: string;
    action: string;
    description: string;
};

const PERMISSIONS: PermissionDef[] = [
    // ── Menu ──────────────────────────────────────────────────────
    { resource: 'menu', action: 'read',   description: 'View menu items' },
    { resource: 'menu', action: 'write',  description: 'Create and update menu items' },
    { resource: 'menu', action: 'delete', description: 'Delete menu items' },
    { resource: 'menu', action: 'manage', description: 'Full menu control including publish/unpublish' },

    // ── Categories ────────────────────────────────────────────────
    { resource: 'categories', action: 'read',   description: 'View menu categories' },
    { resource: 'categories', action: 'write',  description: 'Create and update categories' },
    { resource: 'categories', action: 'delete', description: 'Delete categories' },

    // ── Orders ────────────────────────────────────────────────────
    { resource: 'orders', action: 'read',          description: 'View orders' },
    { resource: 'orders', action: 'write',         description: 'Place new orders' },
    { resource: 'orders', action: 'update_status', description: 'Update order status (e.g. preparing, ready, served)' },
    { resource: 'orders', action: 'delete',        description: 'Cancel or delete orders' },
    { resource: 'orders', action: 'manage',        description: 'Full order management' },

    // ── Tables ────────────────────────────────────────────────────
    { resource: 'tables', action: 'read',   description: 'View tables' },
    { resource: 'tables', action: 'write',  description: 'Create and update tables' },
    { resource: 'tables', action: 'manage', description: 'Full table management including QR code generation' },

    // ── Reservations ──────────────────────────────────────────────
    { resource: 'reservations', action: 'read',   description: 'View reservations' },
    { resource: 'reservations', action: 'write',  description: 'Create and update reservations' },
    { resource: 'reservations', action: 'manage', description: 'Full reservation management' },

    // ── Stock ─────────────────────────────────────────────────────
    { resource: 'stock', action: 'read',   description: 'View kitchen stock levels' },
    { resource: 'stock', action: 'write',  description: 'Update stock levels' },
    { resource: 'stock', action: 'manage', description: 'Full stock management including alerts' },

    // ── Users ─────────────────────────────────────────────────────
    { resource: 'users', action: 'create',   description: 'Create team members' },
    { resource: 'users', action: 'read',   description: 'View team members' },
    { resource: 'users', action: 'invite', description: 'Invite new staff members' },
    { resource: 'users', action: 'manage', description: 'Manage team (activate, deactivate, change roles)' },

    // ── Roles ─────────────────────────────────────────────────────
    { resource: 'roles', action: 'read',   description: 'View roles and their permissions' },
    { resource: 'roles', action: 'manage', description: 'Create custom roles and assign permissions' },

    // ── Billing ───────────────────────────────────────────────────
    { resource: 'billing', action: 'read',   description: 'View subscription and billing information' },
    { resource: 'billing', action: 'manage', description: 'Manage subscription plan and payment methods' },

    // ── Reports ───────────────────────────────────────────────────
    { resource: 'reports', action: 'read', description: 'View sales and operations reports' },

    // ── Permissions (platform-level — Super Admin only) ───────────
    { resource: 'permissions', action: 'manage', description: 'Add or remove permissions from the catalog (Super Admin only)' },
    { resource: 'tenants', action: 'create', description: 'Add or remove permissions from the catalog (Super Admin only)' },
];

// ─────────────────────────────────────────────────────────────────
// 2. SYSTEM ROLES
//
// Generic — not tied to any product domain.
// Roles like "Kitchen Staff" or "Sales Rep" are created per-tenant
// by the ADMIN via the roles API.
//
// tenantId: null means global (available to all tenants).
// ─────────────────────────────────────────────────────────────────

type RoleDef = {
    name: string;
    description: string;
    // Keys from PERMISSIONS array that this role receives by default.
    // SUPER_ADMIN gets everything — handled separately below.
    permissions: Array<{ resource: string; action: string }>;
};

const SYSTEM_ROLES: RoleDef[] = [
    {
        name: 'SUPER_ADMIN',
        description: 'Platform owner — full access across all tenants and system settings',
        // Gets every permission — assigned dynamically below
        permissions: [],
    },
    {
        name: 'ADMIN',
        description: 'Tenant owner — full operational control within their tenant',
        permissions: [
            { resource: 'menu',         action: 'read' },
            { resource: 'menu',         action: 'write' },
            { resource: 'menu',         action: 'delete' },
            { resource: 'menu',         action: 'manage' },
            { resource: 'categories',   action: 'read' },
            { resource: 'categories',   action: 'write' },
            { resource: 'categories',   action: 'delete' },
            { resource: 'orders',       action: 'read' },
            { resource: 'orders',       action: 'write' },
            { resource: 'orders',       action: 'update_status' },
            { resource: 'orders',       action: 'delete' },
            { resource: 'orders',       action: 'manage' },
            { resource: 'tables',       action: 'read' },
            { resource: 'tables',       action: 'write' },
            { resource: 'tables',       action: 'manage' },
            { resource: 'reservations', action: 'read' },
            { resource: 'reservations', action: 'write' },
            { resource: 'reservations', action: 'manage' },
            { resource: 'stock',        action: 'read' },
            { resource: 'stock',        action: 'write' },
            { resource: 'stock',        action: 'manage' },
            { resource: 'users',        action: 'read' },
            { resource: 'users',        action: 'invite' },
            { resource: 'users',        action: 'manage' },
            { resource: 'roles',        action: 'read' },
            { resource: 'roles',        action: 'manage' },
            { resource: 'billing',      action: 'read' },
            { resource: 'billing',      action: 'manage' },
            { resource: 'reports',      action: 'read' },
            // Note: permissions:manage is NOT included — only SUPER_ADMIN can manage the catalog
        ],
    },
    {
        name: 'MANAGER',
        description: 'Operational lead — manages people and daily operations, no billing or settings access',
        permissions: [
            { resource: 'menu',         action: 'read' },
            { resource: 'menu',         action: 'write' },
            { resource: 'menu',         action: 'manage' },
            { resource: 'categories',   action: 'read' },
            { resource: 'categories',   action: 'write' },
            { resource: 'orders',       action: 'read' },
            { resource: 'orders',       action: 'write' },
            { resource: 'orders',       action: 'update_status' },
            { resource: 'orders',       action: 'manage' },
            { resource: 'tables',       action: 'read' },
            { resource: 'tables',       action: 'manage' },
            { resource: 'reservations', action: 'read' },
            { resource: 'reservations', action: 'write' },
            { resource: 'reservations', action: 'manage' },
            { resource: 'stock',        action: 'read' },
            { resource: 'stock',        action: 'write' },
            { resource: 'stock',        action: 'manage' },
            { resource: 'users',        action: 'read' },
            { resource: 'users',        action: 'invite' },
            { resource: 'roles',        action: 'read' },
            { resource: 'reports',      action: 'read' },
        ],
    },
    {
        name: 'MEMBER',
        description: 'Regular user — day-to-day operational access only',
        permissions: [
            { resource: 'menu',         action: 'read' },
            { resource: 'categories',   action: 'read' },
            { resource: 'orders',       action: 'read' },
            { resource: 'orders',       action: 'write' },
            { resource: 'orders',       action: 'update_status' },
            { resource: 'tables',       action: 'read' },
            { resource: 'tables',       action: 'manage' },
            { resource: 'reservations', action: 'read' },
            { resource: 'reservations', action: 'write' },
            { resource: 'stock',        action: 'read' },
            { resource: 'stock',        action: 'write' },
        ],
    },
    {
        name: 'VIEWER',
        description: 'Read-only access — auditors, external reviewers, silent observers',
        permissions: [
            { resource: 'menu',         action: 'read' },
            { resource: 'categories',   action: 'read' },
            { resource: 'orders',       action: 'read' },
            { resource: 'tables',       action: 'read' },
            { resource: 'reservations', action: 'read' },
            { resource: 'stock',        action: 'read' },
            { resource: 'users',        action: 'read' },
            { resource: 'roles',        action: 'read' },
            { resource: 'reports',      action: 'read' },
        ],
    },
];

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function log(msg: string) {
    process.stdout.write(msg + '\n');
}

function validateEnv() {
    const email    = process.env.SUPER_ADMIN_EMAIL?.trim();
    const password = process.env.SUPER_ADMIN_PASSWORD?.trim();

    if (!email || !password) {
        throw new Error(
            'SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in your environment file.',
        );
    }
    if (password.length < 8) {
        throw new Error('SUPER_ADMIN_PASSWORD must be at least 8 characters.');
    }

    return {
        email,
        password,
        firstName: process.env.SUPER_ADMIN_FIRST_NAME?.trim() || 'Super',
        lastName:  process.env.SUPER_ADMIN_LAST_NAME?.trim()  || 'Admin',
    };
}

// ─────────────────────────────────────────────────────────────────
// SEED RUNNER
// ─────────────────────────────────────────────────────────────────

async function seed() {
    log('Starting seed...\n');

    const adminEnv = validateEnv();

    // Hash password before entering the transaction — bcrypt is CPU-intensive
    // and holding a DB connection open during hashing wastes pool resources
    const passwordHash = await hash(adminEnv.password, 12);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {

        // ── Step 1: Upsert permission catalog ────────────────────
        log(`[1/4] Upserting ${PERMISSIONS.length} permissions...`);

        const permissionRecords = await Promise.all(
            PERMISSIONS.map((p) =>
                tx.permission.upsert({
                    where:  { resource_action: { resource: p.resource, action: p.action } },
                    update: { description: p.description },
                    create: p,
                }),
            ),
        );

        // Build lookup: "resource:action" → permission id
        const permMap = new Map(
            permissionRecords.map((p) => [`${p.resource}:${p.action}`, p.id]),
        );

        log(`    ${permissionRecords.length} permissions ready.\n`);

        // ── Step 2: Upsert system roles ───────────────────────────
        log(`[2/4] Upserting ${SYSTEM_ROLES.length} system roles...`);

        for (const roleDef of SYSTEM_ROLES) {
            // Cannot use upsert with null in a compound unique key (NULL != NULL in SQL).
            // Use findFirst + create/update instead.
            const existing = await tx.role.findFirst({
                where: { name: roleDef.name, tenantId: null, isSystem: true },
            });

            const role = existing
                ? await tx.role.update({
                    where:  { id: existing.id },
                    data:   { description: roleDef.description },
                })
                : await tx.role.create({
                    data: {
                        tenantId:    null,
                        name:        roleDef.name,
                        description: roleDef.description,
                        isSystem:    true,
                    },
                });

            // SUPER_ADMIN gets every permission in the catalog
            const permsToAssign =
                roleDef.name === 'SUPER_ADMIN'
                    ? PERMISSIONS.map(({ resource, action }) => ({ resource, action }))
                    : roleDef.permissions;

            // Upsert each role-permission assignment
            await Promise.all(
                permsToAssign.map(({ resource, action }) => {
                    const permId = permMap.get(`${resource}:${action}`);
                    if (!permId) return Promise.resolve(); // skip unknown permissions

                    return tx.rolePermission.upsert({
                        where:  { roleId_permissionId: { roleId: role.id, permissionId: permId } },
                        update: {},
                        create: { roleId: role.id, permissionId: permId },
                    });
                }),
            );

            log(`    ${role.name.padEnd(12)} — ${permsToAssign.length} permissions`);
        }

        log('');

        // ── Step 3: Platform tenant ───────────────────────────────
        log('[3/4] Upserting platform tenant...');

        const platformTenant = await tx.tenant.upsert({
            where:  { slug: 'redor-platform' },
            update: {},
            create: {
                name:     'Redor Platform',
                slug:     'redor-platform',
                isActive: true,
            },
        });

        log(`    Tenant: "${platformTenant.name}" (id: ${platformTenant.id})\n`);

        // ── Step 4: Super admin user ──────────────────────────────
        log('[4/4] Upserting super admin user...');

        // Only hash password on first create — do not overwrite on re-seed
        const existingAdmin = await tx.user.findUnique({
            where: { email: adminEnv.email },
        });

        const adminUser = existingAdmin
            ? existingAdmin
            : await tx.user.create({
                data: {
                    email:         adminEnv.email,
                    passwordHash,
                    firstName:     adminEnv.firstName,
                    lastName:      adminEnv.lastName,
                    isActive:      true,
                    emailVerified: true,
                },
            });

        const superAdminRole = await tx.role.findFirst({
            where: { name: 'SUPER_ADMIN', isSystem: true, tenantId: null },
        });

        if (!superAdminRole) {
            throw new Error('SUPER_ADMIN role was not created in step 2 — seed is inconsistent.');
        }

        await tx.userTenantRole.upsert({
            where: {
                userId_tenantId_roleId: {
                    userId:   adminUser.id,
                    tenantId: platformTenant.id,
                    roleId:   superAdminRole.id,
                },
            },
            update: {},
            create: {
                userId:   adminUser.id,
                tenantId: platformTenant.id,
                roleId:   superAdminRole.id,
            },
        });

        log(`    User:   ${adminUser.email}`);
        log(`    Role:   SUPER_ADMIN`);
        log(`    Tenant: redor-platform`);
    });

    log('\nSeed complete.');
}

// ─────────────────────────────────────────────────────────────────
// ENTRY POINT
// ─────────────────────────────────────────────────────────────────

seed()
    .catch((err: Error) => {
        console.error('\nSeed failed:', err.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
