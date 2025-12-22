import { Request, Response } from 'express';
import { paperTradingEngine } from '../services/PaperTradingEngine';
import { orderService } from '../services/OrderService';
import Order from '../models/Order';
import Account from '../models/Account';
import { assertAccountOwnership } from '../utils/assertOwnership';

export class OrderController {

    /**
     * Place a simplified order (frontend-friendly)
     * Accepts: { symbol, type, quantity, price? }
     */
    async placeSimpleOrder(req: Request, res: Response) {
        try {
            // @ts-ignore - userId attached by middleware
            const userId = (req as any).userId;
            const { symbol, type, quantity, price, orderType } = req.body;

            const result = await orderService.placeSimpleOrder(userId, {
                symbol,
                type,
                quantity,
                price,
                orderType
            });

            if (result.success) {
                res.status(201).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    /**
     * Place an advanced order (requires full schema)
     */
    async placeOrder(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = (req as any).userId;
            const orderData = req.body;

            // Verify ownership of the account
            if (orderData.accountId) {
                await assertAccountOwnership(userId, orderData.accountId);
            }

            // Ensure accountId is passed in body
            const order = await paperTradingEngine.placeOrder(orderData);
            res.status(201).json(order);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    async getOrders(req: Request, res: Response) {
        try {
            // @ts-ignore - userId attached by middleware
            const userId = (req as any).userId;
            let { accountId } = req.query;

            // If no accountId provided, get user's default account
            if (!accountId) {
                const account = await Account.findOne({ userId });
                if (!account) {
                    return res.json({ orders: [] });
                }
                accountId = account._id.toString();
            } else {
                // Verify ownership
                await assertAccountOwnership(userId, accountId as string);
            }

            const orders = await Order.find({ accountId }).sort({ createdAt: -1 });
            res.json({ orders });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async cancelOrder(req: Request, res: Response) {
        try {
            // @ts-ignore
            const userId = (req as any).userId;
            const { orderId } = req.params;

            const result = await orderService.cancelOrder(userId, orderId);

            if (result.success) {
                res.status(200).json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

export const orderController = new OrderController();
