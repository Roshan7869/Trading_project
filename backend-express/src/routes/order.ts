import express from 'express';
import { orderController } from '../controllers/OrderController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/place', authenticateToken, orderController.placeOrder);
router.get('/history', authenticateToken, orderController.getOrders);

export default router;