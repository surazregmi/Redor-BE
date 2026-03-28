// src/config/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { DATABASE_URL, NODE_ENV } from '../config';

if (!DATABASE_URL) {
    throw new Error(
        'DATABASE_URL is not defined. Please check your environment file.',
    );
}

// Use pooled connection (PgBouncer) for runtime queries
const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
    adapter,
    log:
        NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
});

// Graceful shutdown — prevents connection leaks on process restart
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default prisma;
