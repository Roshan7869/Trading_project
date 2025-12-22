/**
 * RedisService
 * Centralized Redis client for Pub/Sub and caching.
 * Used to broadcast broker updates to the Python Data Engine.
 */

import Redis from 'ioredis';
import logger from '../utils/logger';

class RedisService {
    private client: Redis | null = null;
    private subscriber: Redis | null = null;
    private isConnected: boolean = false;

    /**
     * Initialize Redis connections.
     */
    async connect(): Promise<void> {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        try {
            this.client = new Redis(redisUrl, {
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });

            await this.client.connect();
            this.isConnected = true;
            logger.info('✅ Redis connected for publishing');

        } catch (error: any) {
            logger.error(`❌ Redis connection failed: ${error.message}`);
            this.isConnected = false;
        }
    }

    /**
     * Disconnect from Redis.
     */
    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.client = null;
        }
        if (this.subscriber) {
            await this.subscriber.quit();
            this.subscriber = null;
        }
        this.isConnected = false;
        logger.info('Redis disconnected');
    }

    /**
     * Publish a message to a channel.
     */
    async publish(channel: string, message: object): Promise<boolean> {
        if (!this.client || !this.isConnected) {
            logger.warn('Redis not connected, cannot publish');
            return false;
        }

        try {
            const payload = JSON.stringify(message);
            await this.client.publish(channel, payload);
            logger.debug(`Published to ${channel}: ${payload}`);
            return true;
        } catch (error: any) {
            logger.error(`Redis publish failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Notify the Data Engine that a broker connection was updated.
     * The Data Engine listens on 'broker_update' channel.
     */
    async notifyBrokerUpdate(userId: string, broker: string, action: 'connect' | 'disconnect' | 'switch'): Promise<boolean> {
        return this.publish('broker_update', {
            userId,
            broker,
            action,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Set a value in Redis with optional expiration in seconds.
     */
    async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
        if (!this.client || !this.isConnected) return false;
        try {
            const stringValue = JSON.stringify(value);
            if (ttlSeconds) {
                await this.client.set(key, stringValue, 'EX', ttlSeconds);
            } else {
                await this.client.set(key, stringValue);
            }
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get a value from Redis.
     */
    async get<T>(key: string): Promise<T | null> {
        if (!this.client || !this.isConnected) return null;
        try {
            const value = await this.client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Delete a key from Redis.
     */
    async del(key: string): Promise<boolean> {
        if (!this.client || !this.isConnected) return false;
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get the Redis client for direct operations.
     */
    getClient(): Redis | null {
        return this.client;
    }

    /**
     * Check if Redis is connected.
     */
    isReady(): boolean {
        return this.isConnected && this.client !== null;
    }
}

// Singleton instance
export const redisService = new RedisService();
export default redisService;
