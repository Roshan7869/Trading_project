import express from 'express';
import Portfolio from '../models/Portfolio';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get portfolio
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        let portfolio = await Portfolio.findOne({ userId: req.user.id });

        if (!portfolio) {
            // Return empty portfolio if not exists
            return res.json({
                holdings: [],
                totalInvestedValue: 0
            });
        }

        res.json(portfolio);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
