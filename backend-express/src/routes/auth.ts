import express from 'express';
import { authController } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', authenticateToken, authController.getProfile);

export default router;