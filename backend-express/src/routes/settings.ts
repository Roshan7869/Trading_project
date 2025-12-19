/**
 * Settings Routes
 * API endpoints for broker configuration management.
 */

import express from 'express';
import { settingsController } from '../controllers/SettingsController';
import { authenticateToken } from '../middleware/auth';

import { validateRequest } from '../middleware/validateRequest';
import { saveBrokerSchema } from '../schemas/settingsSchema';

const router = express.Router();

// Get available brokers (public)
router.get('/brokers', settingsController.getAvailableBrokers);

// Protected routes
router.get('/broker', authenticateToken, settingsController.getBrokerConfig);
router.post('/broker', authenticateToken, validateRequest(saveBrokerSchema), settingsController.saveBrokerConfig);
router.delete('/broker/:broker', authenticateToken, settingsController.disconnectBroker);

export default router;
