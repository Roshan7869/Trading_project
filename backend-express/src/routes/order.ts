import express from 'express';
import { orderController } from '../controllers/OrderController';
import { authenticateToken } from '../middleware/auth';

import { validateRequest } from '../middleware/validateRequest';
import { simpleOrderSchema } from '../schemas/orderSchema';

import { advancedOrderSchema } from '../schemas/advancedOrderSchema';

const router = express.Router();

// Simplified order endpoint for frontend
router.post('/quick', authenticateToken, validateRequest(simpleOrderSchema), orderController.placeSimpleOrder);

// Advanced order endpoint (requires full schema)
router.post('/place', authenticateToken, validateRequest(advancedOrderSchema), orderController.placeOrder);

// Order history
router.get('/history', authenticateToken, orderController.getOrders);

// Cancel order
router.delete('/:orderId', authenticateToken, orderController.cancelOrder);

export default router;