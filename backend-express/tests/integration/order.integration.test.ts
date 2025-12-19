import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import orderRoutes from '../../src/routes/order';

// Dependencies to mock
import { authenticateToken } from '../../src/middleware/auth';
import { orderController } from '../../src/controllers/OrderController';

// Setup Mock App
const app = express();
app.use(express.json());

// Mock Auth Middleware
vi.mock('../../src/middleware/auth', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.userId = 'user123';
        next();
    }
}));

// Mock Controller
vi.mock('../../src/controllers/OrderController', () => ({
    orderController: {
        placeSimpleOrder: vi.fn(),
        placeOrder: vi.fn(),
        getOrders: vi.fn()
    }
}));

app.use('/api/order', orderRoutes);

describe('Order API Integration', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('POST /api/order/quick', () => {
        it('should call controller methods when valid', async () => {
            vi.mocked(orderController.placeSimpleOrder).mockImplementation((req, res) => {
                res.status(201).json({ success: true, message: 'Order created' });
            } as any);

            const res = await request(app)
                .post('/api/order/quick')
                .send({
                    symbol: 'RELIANCE',
                    type: 'BUY',
                    quantity: 10
                });

            expect(res.status).toBe(201);
            expect(orderController.placeSimpleOrder).toHaveBeenCalled();
        });

        it('should fail validation with invalid symbol', async () => {
            const res = await request(app)
                .post('/api/order/quick')
                .send({
                    symbol: '', // Empty symbol
                    type: 'BUY',
                    quantity: 10
                });

            // zod validation returns 400
            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
        });

        it('should fail validation with negative quantity', async () => {
            const res = await request(app)
                .post('/api/order/quick')
                .send({
                    symbol: 'TCS',
                    type: 'BUY',
                    quantity: -5
                });

            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/order/place', () => {
        it('should fail validation when missing required fields', async () => {
            const res = await request(app)
                .post('/api/order/place')
                .send({
                    symbolName: 'TCS',
                    // missing accountId, scriptToken, etc.
                });

            // Should fail schema validation
            expect(res.status).toBe(400);
        });

        it('should pass validation with complete payload', async () => {
            vi.mocked(orderController.placeOrder).mockImplementation((req, res) => {
                res.status(201).json({ success: true });
            } as any);

            const res = await request(app)
                .post('/api/order/place')
                .send({
                    accountId: 'acc123',
                    scriptToken: '1234',
                    symbolName: 'TCS',
                    exchange: 'NSE',
                    orderType: 'MARKET',
                    quantity: 10,
                    transactionType: 'BUY',
                    productType: 'CNC',
                    validity: 'DAY'
                });

            expect(res.status).toBe(201);
        });
    });
});
