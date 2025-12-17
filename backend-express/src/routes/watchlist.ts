import express from 'express';
import Watchlist from '../models/Watchlist';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Get watchlist
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        let watchlist = await Watchlist.findOne({ userId: req.user.id });

        if (!watchlist) {
            return res.json({ symbols: [] });
        }

        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add to watchlist
router.post('/add', authenticateToken, async (req: any, res) => {
    try {
        const { symbol } = req.body;

        if (!symbol) {
            return res.status(400).json({ error: 'Symbol is required' });
        }

        let watchlist = await Watchlist.findOne({ userId: req.user.id });

        if (!watchlist) {
            watchlist = new Watchlist({
                userId: req.user.id,
                symbols: [symbol]
            });
        } else {
            if (!watchlist.symbols.includes(symbol)) {
                watchlist.symbols.push(symbol);
            }
        }

        await watchlist.save();
        res.json(watchlist);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove from watchlist
router.post('/remove', authenticateToken, async (req: any, res) => {
    try {
        const { symbol } = req.body;

        let watchlist = await Watchlist.findOne({ userId: req.user.id });

        if (watchlist) {
            watchlist.symbols = watchlist.symbols.filter(s => s !== symbol);
            await watchlist.save();
        }

        res.json(watchlist || { symbols: [] });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
