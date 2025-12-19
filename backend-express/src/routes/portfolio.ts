import express from 'express';
import Position from '../models/Position';
import Account from '../models/Account';
import { authenticateToken } from '../middleware/auth';
import { marketDataService } from '../services/MarketDataService';
import { positionService } from '../services/PositionService';
import { IPosition } from '../models/Position';

const router = express.Router();

// Get portfolio (all open positions with real-time P&L)
router.get('/', authenticateToken, async (req: any, res) => {
    try {
        // Get user's account
        const account = await Account.findOne({ userId: req.userId, status: 'ACTIVE' });

        if (!account) {
            return res.json({
                positions: [],
                summary: {
                    totalInvested: 0,
                    currentValue: 0,
                    totalPnL: 0,
                    totalPnLPercent: 0
                },
                walletBalance: 0
            });
        }

        // Get all open positions via service (enforces ownership)
        const positions = await positionService.getOpenPositions(req.userId, account._id.toString());

        // Calculate real-time P&L for each position
        const positionsWithPnL = positions.map(position => {
            const marketData = position.symbolName ? marketDataService.getPrice(position.symbolName) : undefined;
            const currentPrice = marketData?.price || position.currentPrice;
            const currentValue = Math.abs(position.quantity) * currentPrice;
            const investedAmount = position.quantity * position.avgBuyPrice;
            const unrealizedPnL = currentValue - investedAmount;
            const unrealizedPnLPercent = investedAmount > 0
                ? (unrealizedPnL / investedAmount) * 100
                : 0;

            return {
                _id: position._id,
                symbol: position.symbolName,
                exchange: position.exchange,
                quantity: position.quantity,
                avgBuyPrice: position.avgBuyPrice,
                currentPrice: currentPrice,
                investedAmount: investedAmount,
                currentValue: currentValue,
                unrealizedPnL: unrealizedPnL,
                unrealizedPnLPercent: unrealizedPnLPercent,
                dayChange: marketData?.change || 0
            };
        });

        // Calculate portfolio summary
        const summary = positionsWithPnL.reduce((acc, pos) => ({
            totalInvested: acc.totalInvested + pos.investedAmount,
            currentValue: acc.currentValue + pos.currentValue,
            totalPnL: acc.totalPnL + pos.unrealizedPnL,
            totalPnLPercent: 0 // Calculated below
        }), { totalInvested: 0, currentValue: 0, totalPnL: 0, totalPnLPercent: 0 });

        summary.totalPnLPercent = summary.totalInvested > 0
            ? (summary.totalPnL / summary.totalInvested) * 100
            : 0;

        res.json({
            positions: positionsWithPnL,
            summary,
            walletBalance: account.currentCash
        });
    } catch (error) {
        console.error('Portfolio error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get account summary
router.get('/summary', authenticateToken, async (req: any, res) => {
    try {
        const account = await Account.findOne({ userId: req.userId, status: 'ACTIVE' });

        if (!account) {
            return res.json({
                initialCapital: 100000,
                currentCash: 0,
                totalInvested: 0,
                availableMargin: 0
            });
        }

        res.json({
            initialCapital: account.initialCapital,
            currentCash: account.currentCash,
            totalInvested: account.totalInvested,
            availableMargin: account.availableMargin,
            performanceMetrics: account.performanceMetrics
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
