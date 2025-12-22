import express from 'express';
import Watchlist from '../models/Watchlist';
import { authenticateToken } from '../middleware/auth';
import { Types } from 'mongoose';

const router = express.Router();

// Get ALL watchlists for user
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        let watchlists = await Watchlist.find({ userId: req.userId }).sort({ isDefault: -1, createdAt: 1 });

        // If no watchlist exists, create default one
        if (watchlists.length === 0) {
            const defaultWatchlist = new Watchlist({
                userId: req.userId,
                name: 'My Watchlist',
                isDefault: true,
                symbols: []
            });
            await defaultWatchlist.save();
            watchlists = [defaultWatchlist];
        }

        // Transform response
        const formatted = watchlists.map(w => ({
            _id: w._id,
            name: w.name,
            isDefault: w.isDefault,
            symbols: w.symbols.map(s => s.symbolName || s.scriptToken)
        }));

        res.json(formatted);
    } catch (error: any) {
        console.error('Watchlist LIST error:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Create new watchlist
router.post('/create', authenticateToken, async (req: any, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const newWatchlist = new Watchlist({
            userId: req.userId,
            name,
            isDefault: false,
            symbols: []
        });

        await newWatchlist.save();

        res.json({
            _id: newWatchlist._id,
            name: newWatchlist.name,
            isDefault: newWatchlist.isDefault,
            symbols: []
        });
    } catch (error: any) {
        console.error('Watchlist CREATE error:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Delete watchlist
router.delete('/:id', authenticateToken, async (req: any, res) => {
    try {
        const { id } = req.params;
        const watchlist = await Watchlist.findOne({ _id: id, userId: req.userId });

        if (!watchlist) return res.status(404).json({ error: 'Watchlist not found' });
        if (watchlist.isDefault) return res.status(400).json({ error: 'Cannot delete default watchlist' });

        await Watchlist.deleteOne({ _id: id });
        res.json({ success: true, message: 'Watchlist deleted' });
    } catch (error: any) {
        console.error('Watchlist DELETE error:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Add to watchlist
router.post('/add', authenticateToken, async (req: any, res) => {
    try {
        const { symbol, watchlistId } = req.body;

        if (!symbol) return res.status(400).json({ error: 'Symbol is required' });

        // If watchlistId provided, find that one. Else find default.
        let query: any = { userId: req.userId };
        if (watchlistId) {
            query._id = watchlistId;
        } else {
            query.isDefault = true;
        }

        let watchlist = await Watchlist.findOne(query);

        if (!watchlist) {
            // Fallback: search for ANY watchlist if default missing/deleted manually
            watchlist = await Watchlist.findOne({ userId: req.userId });
            if (!watchlist) {
                return res.status(404).json({ error: 'No watchlist found' });
            }
        }

        // Check if symbol exists
        const exists = watchlist.symbols.some(s =>
            s.symbolName === symbol || s.scriptToken === symbol
        );

        if (!exists) {
            watchlist.symbols.push({
                scriptToken: symbol,
                symbolName: symbol,
                exchange: 'NSE',
                addedAt: new Date(),
                alerts: []
            } as any);
            await watchlist.save();
        }

        res.json({
            _id: watchlist._id,
            symbols: watchlist.symbols.map(s => s.symbolName || s.scriptToken)
        });
    } catch (error: any) {
        console.error('Watchlist ADD error:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

// Remove from watchlist
router.post('/remove', authenticateToken, async (req: any, res) => {
    try {
        const { symbol, watchlistId } = req.body;

        let query: any = { userId: req.userId };
        if (watchlistId) {
            query._id = watchlistId;
        } else {
            query.isDefault = true;
        }

        const watchlist = await Watchlist.findOne(query);

        if (watchlist) {
            watchlist.symbols = watchlist.symbols.filter(s =>
                s.symbolName !== symbol && s.scriptToken !== symbol
            );
            await watchlist.save();

            res.json({
                _id: watchlist._id,
                symbols: watchlist.symbols.map(s => s.symbolName || s.scriptToken)
            });
        } else {
            res.status(404).json({ error: 'Watchlist not found' });
        }
    } catch (error: any) {
        console.error('Watchlist REMOVE error:', error);
        res.status(500).json({ error: 'Server error', message: error.message });
    }
});

export default router;
