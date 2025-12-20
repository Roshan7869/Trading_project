import express from 'express';
import { marketDataService } from '../services/MarketDataService';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';

const router = express.Router();

// Get all current market prices
router.get('/prices', (req, res) => {
    const prices = marketDataService.getAllPrices();
    res.json({ prices });
});

// Get specific symbol price
router.get('/price/:symbol', (req, res) => {
    const { symbol } = req.params;
    const price = marketDataService.getPrice(symbol);

    if (!price) {
        return res.status(404).json({ error: 'Symbol not found' });
    }

    res.json(price);
});

// Get historical OHLC candles
router.get('/history/:symbol', (req, res) => {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const candles = marketDataService.getCandles(symbol, limit);

    if (candles.length === 0) {
        return res.status(404).json({ error: 'No candle data available for symbol' });
    }

    res.json({ symbol, timeframe: '1m', candles });
});

// Search for instruments (New Feature for "All Shares")
router.get('/search', async (req, res, next) => {
    try {
        const query = req.query.query as string;
        if (!query || query.length < 2) {
            return res.json([]);
        }

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database not connected');
        }

        // Search in the 'instruments' collection populated by instrument_loader.py
        const collection = db.collection('instruments');

        // Regex search for symbol or name
        const results = await collection.find({
            $or: [
                { symbol: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ]
        })
            .limit(10)
            .project({ symbol: 1, name: 1, token: 1, exchange: 1, _id: 0 })
            .toArray();

        res.json(results);
    } catch (error) {
        next(error);
    }
});

export default router;
