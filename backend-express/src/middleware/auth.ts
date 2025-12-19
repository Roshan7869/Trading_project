import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User';
import { accountService } from '../services/AccountService';

// TEST MODE: Set to true to bypass authentication for testing
const TEST_MODE = process.env.TEST_MODE === 'true';
const TEST_USER_ID = '000000000000000000000001';

export interface AuthRequest extends Request {
    userId?: string;
    user?: { id: string; email?: string; clerkId?: string };
    auth?: { userId: string }; // Clerk's auth object
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. TEST MODE BYPASS
    if (TEST_MODE) {
        // ... (Test Mode Logic preserved, but maybe use Demo User now?)
        // Let's keep using the seeded test user for now if configured
        const testUserId = process.env.TEST_USER_MONGO_ID || TEST_USER_ID;
        req.userId = testUserId;
        req.user = { id: testUserId, email: 'test@example.com' };
        return next();
    }

    try {
        // 2. Extract Token
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // 3. Verify Token with Clerk
        // Note: verifyToken returns the decoded JWT claims, including 'sub' (User ID)
        const decodedToken = await clerkClient.verifyToken(token);
        const clerkUserId = decodedToken.sub;

        // 4. Find User in Mongo
        let user = await User.findOne({ clerkId: clerkUserId });

        // 5. User Sync (Lazy Creation)
        if (!user) {
            // Fetch user details from Clerk
            const clerkUser = await clerkClient.users.getUser(clerkUserId);
            const email = clerkUser.emailAddresses[0]?.emailAddress;
            const firstName = clerkUser.firstName || 'Trader';
            const lastName = clerkUser.lastName || '';

            // Check if user exists by email (to link accounts)
            user = await User.findOne({ email });

            if (user) {
                // Link existing user to Clerk ID
                user.clerkId = clerkUserId;
                await user.save();
            } else {
                // Create new user
                user = new User({
                    clerkId: clerkUserId,
                    email,
                    firstName,
                    lastName,
                    name: `${firstName} ${lastName}`.trim(),
                    status: 'ACTIVE',
                    preferences: {
                        theme: 'light',
                        notifications: { email: true, push: true, sms: false },
                        defaultTimeframe: '5min'
                    }
                });
                await user.save();

                // Create default account
                await accountService.createAccount(
                    user._id.toString(),
                    'Primary Trading Account',
                    100000,
                    'ANGEL_ONE'
                );
            }
        }

        // 6. Attach to Request
        req.userId = user._id.toString();
        req.user = { id: user._id.toString(), email: user.email, clerkId: clerkUserId };

        next();
    } catch (error) {
        console.error('Auth Error:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};