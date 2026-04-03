/*
  Warnings:

  - The values [TENANT_ADMIN,STAFF,KITCHEN] on the enum `SystemRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SystemRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');
ALTER TYPE "SystemRole" RENAME TO "SystemRole_old";
ALTER TYPE "SystemRole_new" RENAME TO "SystemRole";
DROP TYPE "public"."SystemRole_old";
COMMIT;
