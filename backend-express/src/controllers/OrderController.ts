import { Request, Response } from 'express';
import { paperTradingEngine } from '../services/PaperTradingEngine';
import Order from '../models/Order';

export class OrderController {

    async placeOrder(req: Request, res: Response) {
        try {
            const orderData = req.body;
            // Ensure accountId is passed in body
            const order = await paperTradingEngine.placeOrder(orderData);
            res.status(201).json(order);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async getOrders(req: Request, res: Response) {
        try {
            const { accountId } = req.query;
            if (!accountId) {
                return res.status(400).json({ message: 'AccountId is required' });
            }

            const orders = await Order.find({ accountId }).sort({ createdAt: -1 });
            res.json(orders);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export const orderController = new OrderController();
