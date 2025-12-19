import express, { Request, Response, NextFunction } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

import { validateRequest } from '../middleware/validateRequest';
import { registerSchema, loginSchema } from '../schemas/authSchema';

const router = express.Router();

// Deprecation warning middleware
const deprecationWarning = (req: Request, res: Response, next: NextFunction) => {
    console.warn(`⚠️ DEPRECATED: ${req.method} ${req.originalUrl} - Use Clerk for authentication instead.`);
    res.setHeader('X-Deprecated', 'true');
    res.setHeader('X-Deprecation-Notice', 'This endpoint is deprecated. Use Clerk authentication instead.');
    next();
};

// DEPRECATED: These routes are for backward compatibility only.
// New users should use Clerk (https://clerk.com) for authentication.
router.post('/register', deprecationWarning, validateRequest(registerSchema), authController.register);
router.post('/login', deprecationWarning, validateRequest(loginSchema), authController.login);
router.get('/profile', authenticateToken, authController.getProfile);

export default router;