import express, { Request, Response } from 'express';
import { BrokerFactory } from '../services/broker-adapter/BrokerFactory';
import UserBrokerConnection from '../models/UserBrokerConnection';
import Order from '../models/Order';
import { IBrokerAdapter } from '../services/broker-adapter/IBrokerAdapter';
import { encryptCredentials } from '../utils/EncryptionService';
import { redisService } from '../services/RedisService';

const router = express.Router();

// Store active adapters per user session (In-memory for now)
const userBrokers = new Map<string, IBrokerAdapter>();

// Initialize broker for user
router.post('/connect', async (req: Request, res: Response) => {
    try {
        const { userId, brokerName, credentials } = req.body;

        if (!userId || !brokerName || !credentials) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const adapter = BrokerFactory.createAdapter(brokerName, credentials);
        const authResult = await adapter.authenticate();

        if (authResult.success) {
            userBrokers.set(`${userId}_${brokerName}`, adapter);

            // Encrypt credentials before storing
            const encryptedCredentials = encryptCredentials(credentials);

            // Store in database with encrypted credentials
            await UserBrokerConnection.findOneAndUpdate(
                { userId, brokerName },
                {
                    credentials: encryptedCredentials,
                    connectedAt: new Date(),
                    status: 'active'
                },
                { upsert: true, new: true }
            );

            // Notify Data Engine to start streaming for this user
            await redisService.notifyBrokerUpdate(userId, brokerName, 'connect');

            res.json({
                success: true,
                message: `Connected to ${brokerName} successfully`,
                broker: brokerName,
                connectedAt: new Date()
            });

        } else {
            res.status(401).json({ success: false, message: 'Authentication failed' });
        }
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Get available brokers
router.get('/available', (req: Request, res: Response) => {
    res.json({
        brokers: BrokerFactory.getSupportedBrokers()
    });
});

// Get user's connected brokers
router.get('/connected', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const brokers = await UserBrokerConnection.find({ userId, status: 'active' });

        res.json({
            connectedBrokers: brokers.map(b => ({
                name: b.brokerName,
                connectedAt: b.connectedAt,
                status: b.status
            }))
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ===== UNIVERSAL TRADING ENDPOINTS =====

// Place order (broker-agnostic)
router.post('/orders/place', async (req: Request, res: Response) => {
    try {
        const { userId, brokerName, orderData } = req.body;
        const adapter = userBrokers.get(`${userId}_${brokerName}`);

        if (!adapter) {
            return res.status(401).json({ error: 'Broker not connected in current session' });
        }

        const result = await adapter.placeOrder(orderData);

        if (result.success) {
            // Create order entry in DB
            // Note: Mapping result to Order model might need tuning based on IOrder schema
            await Order.create({
                userId,
                orderId: result.orderId,
                symbolName: orderData.symbol,
                exchange: orderData.exchange,
                orderType: orderData.orderType,
                quantity: orderData.quantity,
                transactionType: orderData.side,
                status: 'PENDING',
                // ... add other relevant fields as per your schema
            });
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel order
router.post('/orders/:orderId/cancel', async (req: Request, res: Response) => {
    try {
        const { userId, brokerName } = req.body;
        const { orderId } = req.params;

        const adapter = userBrokers.get(`${userId}_${brokerName}`);
        if (!adapter) {
            return res.status(401).json({ error: 'Broker not connected' });
        }

        const result = await adapter.cancelOrder(orderId);

        if (result.success) {
            await Order.findOneAndUpdate({ orderId }, { status: 'CANCELLED' });
        }

        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get active positions
router.get('/positions', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const connections = await UserBrokerConnection.find({ userId, status: 'active' });

        const allPositions = [];

        for (let conn of connections) {
            const adapter = userBrokers.get(`${userId}_${conn.brokerName}`);
            if (adapter) {
                const result = await adapter.getPositions();
                if (result.success) {
                    allPositions.push({
                        broker: conn.brokerName,
                        positions: result.positions
                    });
                }
            }
        }

        res.json({ positions: allPositions });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get holdings
router.get('/holdings', async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const connections = await UserBrokerConnection.find({ userId, status: 'active' });

        const allHoldings = [];

        for (let conn of connections) {
            const adapter = userBrokers.get(`${userId}_${conn.brokerName}`);
            if (adapter) {
                const result = await adapter.getHoldings();
                if (result.success) {
                    allHoldings.push({
                        broker: conn.brokerName,
                        holdings: result.holdings
                    });
                }
            }
        }

        res.json({ holdings: allHoldings });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get margin
router.get('/margin', async (req: Request, res: Response) => {
    try {
        const { userId, brokerName } = req.query;
        const adapter = userBrokers.get(`${userId}_${brokerName}`);

        if (!adapter) {
            return res.status(401).json({ error: 'Broker not connected' });
        }

        const result = await adapter.getMargin();
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get market quote
router.get('/market/quote', async (req: Request, res: Response) => {
    try {
        const { userId, brokerName, symbols } = req.query;
        const adapter = userBrokers.get(`${userId}_${brokerName}`);

        if (!adapter) {
            return res.status(401).json({ error: 'Broker not connected' });
        }

        if (typeof symbols !== 'string') {
            return res.status(400).json({ error: 'Symbols must be a comma-separated string' });
        }

        const result = await adapter.getQuote(symbols.split(','));
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
