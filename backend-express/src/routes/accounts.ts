import express from 'express';
import { accountController } from '../controllers/AccountController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Create new account
router.post('/', authenticateToken, accountController.createAccount);

// Get all accounts for user
router.get('/', authenticateToken, accountController.getAccounts);

// Get specific account
router.get('/:id', authenticateToken, accountController.getAccountById);

export default router;
