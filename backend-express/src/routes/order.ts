import express, { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import User from '../models/User';
import Portfolio from '../models/Portfolio';

const router = express.Router();

// Place order (Buy/Sell)
router.post('/place', authenticateToken, async (req: AuthRequest, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { symbol, type, quantity, price } = req.body;
        const userId = req.userId!;

        // Validate input
        if (!symbol || !type || !quantity || !price) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (type !== 'BUY' && type !== 'SELL') {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Invalid order type' });
        }

        if (quantity <= 0 || price <= 0) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Quantity and price must be positive' });
        }

        const totalAmount = quantity * price;

        // Get user and portfolio
        const user = await User.findOne({ id: userId }).session(session);
        if (!user) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'User not found' });
        }

        const portfolio = await Portfolio.findOne({ userId }).session(session);
        if (!portfolio) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Portfolio not found' });
        }

        if (type === 'BUY') {
            // Check wallet balance
            if (user.walletBalance < totalAmount) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'Insufficient wallet balance' });
            }

            // Deduct from wallet
            user.walletBalance -= totalAmount;
            await user.save({ session });

            // Update portfolio
            const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);
            if (existingHolding) {
                const newQuantity = existingHolding.quantity + quantity;
                const newInvestedValue = existingHolding.investedValue + totalAmount;
                existingHolding.quantity = newQuantity;
                existingHolding.avgPrice = newInvestedValue / newQuantity;
                existingHolding.investedValue = newInvestedValue;
            } else {
                portfolio.holdings.push({
                    symbol,
                    quantity,
                    avgPrice: price,
                    investedValue: totalAmount
                });
            }

            portfolio.totalInvestedValue += totalAmount;
            portfolio.updatedAt = new Date();
            await portfolio.save({ session });
        } else {
            // SELL
            const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);
            if (!existingHolding || existingHolding.quantity < quantity) {
                await session.abortTransaction();
                return res.status(400).json({ error: 'Insufficient holdings to sell' });
            }

            // Add to wallet
            user.walletBalance += totalAmount;
            await user.save({ session });

            // Update portfolio
            existingHolding.quantity -= quantity;
            const soldValue = quantity * existingHolding.avgPrice;
            existingHolding.investedValue -= soldValue;

            if (existingHolding.quantity === 0) {
                portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol);
            }

            portfolio.totalInvestedValue -= soldValue;
            portfolio.updatedAt = new Date();
            await portfolio.save({ session });
        }

        // Create order
        const orderId = uuidv4();
        const order = new Order({
            id: orderId,
            userId,
            symbol,
            type,
            quantity,
            price,
            totalAmount,
            status: 'COMPLETED'
        });

        await order.save({ session });

        await session.commitTransaction();

        res.status(201).json({
            message: 'Order placed successfully',
            order: {
                id: order.id,
                symbol: order.symbol,
                type: order.type,
                quantity: order.quantity,
                price: order.price,
                totalAmount: order.totalAmount,
                status: order.status,
                timestamp: order.timestamp
            },
            walletBalance: user.walletBalance
        });
    } catch (error) {
        await session.abortTransaction();
        console.error('Place order error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        session.endSession();
    }
});

// Get order history
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.userId!;
        const orders = await Order.find({ userId }).sort({ timestamp: -1 }).limit(100);

        res.json({
            orders: orders.map(order => ({
                id: order.id,
                symbol: order.symbol,
                type: order.type,
                quantity: order.quantity,
                price: order.price,
                totalAmount: order.totalAmount,
                status: order.status,
                timestamp: order.timestamp
            }))
        });
    } catch (error) {
        console.error('Get order history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;