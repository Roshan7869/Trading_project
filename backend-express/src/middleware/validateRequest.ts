import { ZodType } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const validateRequest = (schema: ZodType) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (e: any) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: 'Validation failed',
            errors: e.errors,
        });
    }
};
