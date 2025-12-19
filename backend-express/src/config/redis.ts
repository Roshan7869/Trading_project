/**
 * Redis Configuration
 * Provides a singleton Redis client for pub/sub messaging.
 */

import { createClient, RedisClientType } from 'redis';

class RedisConfig {
    private client: RedisClientType | null = null;
    private isConnected = false;

    async getClient(): Promise<RedisClientType> {
        if (this.client && this.isConnected) {
            return this.client;
        }

        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        this.client = createClient({ url: redisUrl });

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
            this.isConnected = false;
        });

        this.client.on('connect', () => {
            console.log('✅ Redis client connected');
            this.isConnected = true;
        });

        await this.client.connect();
        return this.client;
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
}

export default new RedisConfig();
