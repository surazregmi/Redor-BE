export class CustomError extends Error {
    public statusCode: number;
    public errors?: string[];

    constructor(message: string, statusCode: number, errors?: string[]) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
