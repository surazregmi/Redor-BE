import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { config } from 'dotenv';

// Prisma CLI doesn't auto-load .env.development — load it explicitly
config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

export default defineConfig({
    schema: path.join('prisma', 'schema.prisma'),
    datasource: {
        // Direct connection (port 5432) — bypasses PgBouncer, required for migrate
        url: process.env.DIRECT_URL,
    },
});
