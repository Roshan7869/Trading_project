import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import { accountService } from './AccountService';

// JWT Secret with production enforcement
const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('CRITICAL: JWT_SECRET environment variable must be set in production!');
        }
        console.warn('⚠️ AUTH: Using insecure default JWT_SECRET in non-production environment');
        return 'dev_secret_only_not_for_prod';
    }
    return secret;
};

export class AuthService {
    private static readonly JWT_SECRET = getJwtSecret();
    private static readonly TOKEN_EXPIRY = '24h';
    private static readonly REFRESH_TOKEN_EXPIRY = '7d';

    /**
     * Register a new user
     */
    async register(userData: Partial<IUser> & { name?: string }): Promise<{ user: IUser; token: string }> {
        const { email, password, firstName, lastName, name } = userData;

        // Accept 'name' as fallback for 'firstName' (backward compatibility with frontend)
        const userFirstName = firstName || name;

        if (!email || !password || !userFirstName) {
            throw new Error('Missing required fields: email, password, name (or firstName)');
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User already exists with this email');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            email,
            password: hashedPassword,
            firstName: userFirstName,
            lastName,
            name: userFirstName, // Also set legacy name field
            status: 'ACTIVE',
            brokerConnections: [],
            preferences: {
                theme: 'light',
                notifications: { email: true, push: true, sms: false },
                defaultTimeframe: '5min'
            }
        });

        await newUser.save();

        // Create default paper trading account
        await accountService.createAccount(
            newUser._id.toString(),
            'Primary Trading Account',
            100000,
            'ANGEL_ONE'
        );

        const token = this.generateToken(newUser);

        return { user: newUser, token };
    }


    /**
     * Login user
     */
    async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        if (!user.password) {
            throw new Error('User has no password set (possibly social login)');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = this.generateToken(user);

        return { user, token };
    }

    /**
     * Get user profile
     */
    async getProfile(userId: string): Promise<IUser> {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    /**
     * Generate JWT Token
     */
    private generateToken(user: IUser): string {
        return jwt.sign(
            { id: user._id, email: user.email },
            AuthService.JWT_SECRET,
            { expiresIn: AuthService.TOKEN_EXPIRY }
        );
    }

    /**
     * Verify Token
     */
    verifyToken(token: string): any {
        try {
            return jwt.verify(token, AuthService.JWT_SECRET);
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}

export const authService = new AuthService();
