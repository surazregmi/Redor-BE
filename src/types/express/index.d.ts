import { AuthContext } from '../auth.types';

declare module 'express-serve-static-core' {
    interface Request {
        context?: AuthContext;
    }
}
