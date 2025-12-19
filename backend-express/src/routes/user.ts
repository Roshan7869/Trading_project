import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req: any, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get wallet balance
router.get('/wallet', authenticateToken, async (req: any, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ walletBalance: user.walletBalance });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
