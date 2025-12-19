/**
 * Settings Controller
 * Handles broker configuration management for users.
 */

import { Request, Response } from 'express';
import User, { IBrokerConnection } from '../models/User';
import { encrypt, decrypt, maskSensitive } from '../utils/encryption';
import redis from '../config/redis';

// Broker-specific required fields
const BROKER_FIELDS: Record<string, string[]> = {
    ANGEL_ONE: ['apiKey', 'clientCode', 'pin', 'totpSecret'],
    KOTAK_NEO: ['consumerKey', 'consumerSecret', 'mobileNumber', 'password'],
    ZERODHA: ['apiKey', 'apiSecret', 'userId']
};

// Fields that should be encrypted
const ENCRYPTED_FIELDS = ['apiSecret', 'pin', 'totpSecret', 'consumerSecret', 'password', 'accessToken', 'refreshToken'];

export class SettingsController {

    /**
     * Get current broker configuration (masked)
     */
    async getBrokerConfig(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Find active broker connection
            const activeConnection = user.brokerConnections?.find(c => c.isActive);

            if (!activeConnection) {
                return res.json({
                    configured: false,
                    activeBroker: null,
                    connections: []
                });
            }

            // Mask sensitive data for response
            const maskedConnection = {
                broker: activeConnection.broker,
                apiKey: maskSensitive(activeConnection.apiKey || ''),
                clientCode: activeConnection.clientCode,
                mobileNumber: activeConnection.mobileNumber,
                userId: activeConnection.userId,
                isActive: activeConnection.isActive,
                connectedAt: activeConnection.connectedAt,
                lastSyncAt: activeConnection.lastSyncAt
            };

            res.json({
                configured: true,
                activeBroker: activeConnection.broker,
                connection: maskedConnection
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Save/Update broker configuration
     */
    async saveBrokerConfig(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const { broker, ...credentials } = req.body;

            // Validate broker type
            if (!['ANGEL_ONE', 'KOTAK_NEO', 'ZERODHA'].includes(broker)) {
                return res.status(400).json({ message: 'Invalid broker type' });
            }

            // Validate required fields
            const requiredFields = BROKER_FIELDS[broker];
            const missingFields = requiredFields.filter(field => !credentials[field]);
            if (missingFields.length > 0) {
                return res.status(400).json({
                    message: `Missing required fields: ${missingFields.join(', ')}`
                });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Encrypt sensitive fields
            const encryptedCredentials: any = { ...credentials };
            for (const field of ENCRYPTED_FIELDS) {
                if (encryptedCredentials[field]) {
                    encryptedCredentials[field] = encrypt(encryptedCredentials[field]);
                }
            }

            // Deactivate all existing connections
            if (user.brokerConnections) {
                user.brokerConnections.forEach(c => c.isActive = false);
            } else {
                user.brokerConnections = [];
            }

            // Find existing connection for this broker or create new
            let connection = user.brokerConnections.find(c => c.broker === broker);
            if (connection) {
                // Update existing
                Object.assign(connection, {
                    ...encryptedCredentials,
                    isActive: true,
                    connectedAt: new Date()
                });
            } else {
                // Create new connection
                const newConnection = {
                    broker,
                    ...encryptedCredentials,
                    isActive: true,
                    connectedAt: new Date()
                } as IBrokerConnection;
                user.brokerConnections.push(newConnection);
            }

            // Update default broker preference
            user.preferences = user.preferences || {} as any;
            user.preferences.defaultBroker = broker;

            await user.save();

            // Notify data engine of broker change via Redis
            try {
                const redisClient = await redis.getClient();
                await redisClient.publish('broker_update', JSON.stringify({
                    userId,
                    broker,
                    timestamp: new Date().toISOString()
                }));
            } catch (redisError) {
                console.error('Failed to publish broker update:', redisError);
                // Don't fail the request if Redis is unavailable
            }

            res.json({
                success: true,
                message: `${broker} configuration saved successfully`,
                broker
            });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get decrypted credentials for a broker (internal use only)
     */
    async getDecryptedCredentials(userId: string, broker: string): Promise<any | null> {
        const user = await User.findById(userId);
        if (!user) return null;

        const connection = user.brokerConnections?.find(c => c.broker === broker && c.isActive);
        if (!connection) return null;

        // Decrypt sensitive fields
        const connectionObj = connection as unknown as Record<string, any>;
        const decryptedCredentials: any = { ...connectionObj };
        for (const field of ENCRYPTED_FIELDS) {
            if (decryptedCredentials[field]) {
                try {
                    decryptedCredentials[field] = decrypt(decryptedCredentials[field]);
                } catch {
                    // Field might not be encrypted (legacy data)
                }
            }
        }

        return decryptedCredentials;
    }

    /**
     * Disconnect a broker
     */
    async disconnectBroker(req: Request, res: Response) {
        try {
            const userId = (req as any).userId;
            const { broker } = req.params;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            const connection = user.brokerConnections?.find(c => c.broker === broker);
            if (connection) {
                connection.isActive = false;
                connection.accessToken = undefined;
                connection.refreshToken = undefined;
                await user.save();
            }

            res.json({ success: true, message: `${broker} disconnected` });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    /**
     * Get available brokers list
     */
    async getAvailableBrokers(req: Request, res: Response) {
        res.json({
            brokers: [
                {
                    id: 'ANGEL_ONE',
                    name: 'Angel One',
                    description: 'Trade with Angel One SmartAPI',
                    requiredFields: ['apiKey', 'clientCode', 'pin', 'totpSecret'],
                    fieldLabels: {
                        apiKey: 'API Key',
                        clientCode: 'Client Code',
                        pin: 'PIN',
                        totpSecret: 'TOTP Secret'
                    }
                },
                {
                    id: 'KOTAK_NEO',
                    name: 'Kotak Neo',
                    description: 'Trade with Kotak Securities Neo API',
                    requiredFields: ['consumerKey', 'consumerSecret', 'mobileNumber', 'password'],
                    fieldLabels: {
                        consumerKey: 'Consumer Key',
                        consumerSecret: 'Consumer Secret',
                        mobileNumber: 'Mobile Number',
                        password: 'Password'
                    }
                },
                {
                    id: 'ZERODHA',
                    name: 'Zerodha Kite',
                    description: 'Trade with Zerodha Kite Connect API',
                    requiredFields: ['apiKey', 'apiSecret', 'userId'],
                    fieldLabels: {
                        apiKey: 'API Key',
                        apiSecret: 'API Secret',
                        userId: 'User ID'
                    }
                }
            ]
        });
    }
}

export const settingsController = new SettingsController();
