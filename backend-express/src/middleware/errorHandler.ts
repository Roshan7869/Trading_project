import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error(err);

    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message,
            isOperational: err.isOperational
        });
    }

    // Unhandled errors (programming bugs)
    // Don't leak details to client in production
    const statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    const message = process.env.NODE_ENV === 'development'
        ? err.message
        : 'Something went wrong';

    return res.status(statusCode).json({
        success: false,
        message
    });
};
