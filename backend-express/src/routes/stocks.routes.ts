/**
 * Stock API Routes
 * Provides endpoints for stock data using Yahoo Finance as the data source.
 * Optimized with Redis caching and simulated fallbacks for robustness.
 */

import express, { Request, Response } from 'express';
import axios from 'axios';
import { redisService } from '../services/RedisService';
import logger from '../utils/logger';

const router = express.Router();

// Configuration
const YFINANCE_API_URL = process.env.YFINANCE_API_URL || 'http://yfinance-api:5001';
const CACHE_TTL = 60; // 60 seconds

// Indian stock symbols for NSE
const INDIAN_STOCKS = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'ITC', 'SBIN', 'BHARTIARTL', 'HINDUNILVR', 'LT',
    'KOTAKBANK', 'AXISBANK', 'BAJFINANCE', 'MARUTI', 'TATAMOTORS',
    'TATASTEEL', 'WIPRO', 'HCLTECH', 'ONGC', 'NTPC'
];

/**
 * Generate simulated stock data as fallback
 */
function generateSimulatedStock(ticker: string): any {
    const basePrice = Math.random() * 3000 + 100;
    const change = (Math.random() - 0.5) * 50;
    const changePercent = (change / basePrice) * 100;

    return {
        symbol: ticker.toUpperCase(),
        price: Math.round(basePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        high: Math.round((basePrice + Math.abs(change)) * 100) / 100,
        low: Math.round((basePrice - Math.abs(change)) * 100) / 100,
        open: Math.round(basePrice * 100) / 100,
        volume: Math.floor(Math.random() * 10000000),
        timestamp: new Date().toISOString(),
        source: 'simulated'
    };
}

/**
 * Generate simulated historical data as fallback
 */
function generateSimulatedHistory(ticker: string, period: string, interval: string): any {
    const data = [];
    const now = new Date();
    const count = period.includes('mo') ? 30 : 7;
    let basePrice = Math.random() * 2000 + 100;

    for (let i = count; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        const open = basePrice + (Math.random() - 0.5) * 20;
        const high = open + Math.random() * 15;
        const low = open - Math.random() * 15;
        const close = open + (Math.random() - 0.5) * 10;

        data.push({
            date: date.toISOString(),
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100,
            volume: Math.floor(Math.random() * 1000000)
        });

        basePrice = close;
    }

    return {
        symbol: ticker.toUpperCase(),
        period,
        interval,
        data,
        source: 'simulated_fallback'
    };
}

// =====================================================
// ROUTES
// =====================================================

/**
 * GET /api/stocks/watchlist/indian
 * Get data for Indian stock watchlist
 */
router.get('/watchlist/indian', async (req: Request, res: Response) => {
    const cacheKey = 'watchlist_indian';

    try {
        // 1. Try Cache
        const cached = await redisService.get(cacheKey);
        if (cached) return res.json(cached);

        // 2. Try YFinance API
        const response = await axios.get(`${YFINANCE_API_URL}/api/watchlist/indian`, { timeout: 10000 });
        const data = response.data;

        // 3. Cache and Return
        await redisService.set(cacheKey, data, CACHE_TTL);
        return res.json(data);

    } catch (error: any) {
        logger.warn(`Watchlist fetch failed: ${error.message}. Returning simulated data.`);
        // Fallback
        const stocks = INDIAN_STOCKS.map(ticker => generateSimulatedStock(ticker));
        const data = {
            market: 'NSE',
            stocks,
            count: stocks.length,
            timestamp: new Date().toISOString(),
            source: 'simulated'
        };
        return res.json(data);
    }
});

/**
 * GET /api/stocks/market/nifty
 */
router.get('/market/nifty', async (req: Request, res: Response) => {
    const cacheKey = 'market_nifty';

    try {
        const cached = await redisService.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(`${YFINANCE_API_URL}/api/market/nifty`, { timeout: 15000 });
        const data = response.data;

        await redisService.set(cacheKey, data, CACHE_TTL);
        return res.json(data);
    } catch (error: any) {
        const stocks = INDIAN_STOCKS.slice(0, 10).map(ticker => generateSimulatedStock(ticker));
        return res.json({
            market: 'NSE',
            index: 'NIFTY 50',
            stocks,
            count: stocks.length,
            timestamp: new Date().toISOString(),
            source: 'simulated_fallback'
        });
    }
});

/**
 * GET /api/stocks/search
 */
router.get('/search', async (req: Request, res: Response) => {
    const query = (req.query.q as string || '').toUpperCase();
    if (query.length < 2) return res.status(400).json({ error: 'Query too short' });

    try {
        const response = await axios.get(`${YFINANCE_API_URL}/api/search`, {
            params: { q: query },
            timeout: 5000
        });
        return res.json(response.data);
    } catch (error: any) {
        const results = INDIAN_STOCKS
            .filter(s => s.includes(query))
            .map(s => ({ symbol: s, exchange: 'NSE', type: 'Equity' }));
        return res.json({ query, results, count: results.length });
    }
});

/**
 * GET/POST /api/stocks/:ticker/history
 * GET: Basic OHLCV data
 * POST: OHLCV + user-selected indicators
 */
router.get('/:ticker/history', async (req: Request, res: Response) => {
    const ticker = req.params.ticker.toUpperCase();
    const period = req.query.period as string || '1mo';
    const interval = req.query.interval as string || '1d';
    const cacheKey = `history_${ticker}_${period}_${interval}`;

    try {
        const cached = await redisService.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(`${YFINANCE_API_URL}/api/stocks/${ticker}/history`, {
            params: { period, interval },
            timeout: 10000
        });

        await redisService.set(cacheKey, response.data, 300);
        return res.json(response.data);
    } catch (error: any) {
        return res.json(generateSimulatedHistory(ticker, period, interval));
    }
});

// POST handler for user-selected indicators
router.post('/:ticker/history', async (req: Request, res: Response) => {
    const ticker = req.params.ticker.toUpperCase();
    const period = req.query.period as string || '1mo';
    const interval = req.query.interval as string || '1d';
    const selectedIndicators = req.body?.selectedIndicators || [];

    try {
        // Forward POST to yfinance API with selectedIndicators
        const response = await axios.post(
            `${YFINANCE_API_URL}/api/stocks/${ticker}/history?period=${period}&interval=${interval}`,
            { selectedIndicators },
            { timeout: 15000 }
        );
        return res.json(response.data);
    } catch (error: any) {
        logger.warn(`History POST failed for ${ticker}: ${error.message}`);
        // Fallback to simulated data
        return res.json({
            symbol: ticker,
            period,
            interval,
            ohlcv: generateSimulatedHistory(ticker, period, interval).data,
            indicators: { overlays: {}, panes: {} },
            count: 0
        });
    }
});


/**
 * GET /api/stocks/:ticker
 */
router.get('/:ticker', async (req: Request, res: Response) => {
    const ticker = req.params.ticker.toUpperCase();
    const cacheKey = `stock_data_${ticker}`;

    try {
        const cached = await redisService.get(cacheKey);
        if (cached) return res.json(cached);

        const response = await axios.get(`${YFINANCE_API_URL}/api/stocks/${ticker}`, { timeout: 5000 });
        await redisService.set(cacheKey, response.data, CACHE_TTL);
        return res.json(response.data);
    } catch (error: any) {
        return res.json(generateSimulatedStock(ticker));
    }
});

export default router;
