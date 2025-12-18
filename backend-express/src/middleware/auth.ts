import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// TEST MODE: Set to true to bypass authentication for testing
const TEST_MODE = process.env.TEST_MODE === 'true' || true; // Currently enabled for testing
// Valid MongoDB ObjectId format (24 hex characters)
const TEST_USER_ID = '000000000000000000000001';

export interface AuthRequest extends Request {
    userId?: string;
    user?: { id: string; email?: string };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // TEST MODE: Bypass authentication and use mock user
    if (TEST_MODE) {
        // Use the seeded test user ID from environment (set by testSeeder)
        const testUserId = process.env.TEST_USER_MONGO_ID || TEST_USER_ID;
        req.userId = testUserId;
        req.user = { id: testUserId, email: 'test@example.com' };
        console.log('🧪 TEST MODE: Using test user', testUserId);
        return next();
    }

    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; email: string };
        req.userId = decoded.id;
        req.user = { id: decoded.id, email: decoded.email };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};