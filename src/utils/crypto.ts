import { createHash, randomBytes } from 'crypto';

// Generates a cryptographically random 256-bit token string
export const generateSecureToken = (): string => randomBytes(32).toString('hex');

// Deterministic SHA-256 hash — same input always produces same output
export const sha256 = (value: string): string =>
    createHash('sha256').update(value).digest('hex');
