/**
 * Cache Service - Redis caching layer for expensive calculations
 * Implements cache-aside pattern for Portfolio and Position data
 */

import Redis from 'ioredis';
import logger from '../utils/logger';

// Cache TTL settings (in seconds)
const CACHE_TTL = {
    PORTFOLIO: 300,        // 5 minutes
    POSITIONS: 60,         // 1 minute (more volatile)
    MARKET_DATA: 5,        // 5 seconds (real-time)
    USER_PROFILE: 600,     // 10 minutes
};

class CacheService {
    private redis: Redis | null = null;
    private isConnected: boolean = false;
    private metrics = {
        hits: 0,
        misses: 0,
        errors: 0
    };

    constructor() {
        this.connect();
    }

    private connect() {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            this.redis = new Redis(redisUrl, {
                retryStrategy: (times) => {
                    if (times > 3) {
                        logger.warn('Redis connection failed after 3 retries, caching disabled');
                        return null; // Stop retrying
                    }
                    return Math.min(times * 100, 3000);
                },
                maxRetriesPerRequest: 1,
                enableReadyCheck: true,
                lazyConnect: true
            });

            this.redis.on('connect', () => {
                this.isConnected = true;
                logger.info('✅ CacheService: Redis connected');
            });

            this.redis.on('error', (err) => {
                this.isConnected = false;
                logger.error('CacheService Redis error:', err.message);
            });

            this.redis.connect().catch(() => {
                logger.warn('CacheService: Redis not available, caching disabled');
            });
        } catch (error) {
            logger.warn('CacheService: Failed to initialize Redis');
        }
    }

    /**
     * Get cached value or compute and cache
     */
    async getOrSet<T>(
        key: string,
        computeFn: () => Promise<T>,
        ttlSeconds: number = 300
    ): Promise<T> {
        if (!this.isConnected || !this.redis) {
            // Cache unavailable, compute directly
            return computeFn();
        }

        try {
            // Try to get from cache
            const cached = await this.redis.get(key);
            if (cached) {
                this.metrics.hits++;
                return JSON.parse(cached);
            }

            // Cache miss - compute value
            this.metrics.misses++;
            const value = await computeFn();

            // Store in cache (don't await, fire and forget)
            this.redis.setex(key, ttlSeconds, JSON.stringify(value)).catch(() => { });

            return value;
        } catch (error) {
            this.metrics.errors++;
            // On any cache error, fall back to direct computation
            return computeFn();
        }
    }

    /**
     * Get portfolio from cache or compute
     */
    async getPortfolio(userId: string, computeFn: () => Promise<any>): Promise<any> {
        const key = `portfolio:${userId}`;
        return this.getOrSet(key, computeFn, CACHE_TTL.PORTFOLIO);
    }

    /**
     * Get open positions from cache or compute
     */
    async getPositions(userId: string, computeFn: () => Promise<any>): Promise<any> {
        const key = `positions:${userId}`;
        return this.getOrSet(key, computeFn, CACHE_TTL.POSITIONS);
    }

    /**
     * Get market data from cache or compute
     */
    async getMarketData(symbol: string, computeFn: () => Promise<any>): Promise<any> {
        const key = `market:${symbol}`;
        return this.getOrSet(key, computeFn, CACHE_TTL.MARKET_DATA);
    }

    /**
     * Invalidate portfolio cache for a user
     */
    async invalidatePortfolio(userId: string): Promise<void> {
        if (!this.isConnected || !this.redis) return;

        try {
            await this.redis.del(`portfolio:${userId}`);
            await this.redis.del(`positions:${userId}`);
            logger.debug(`Cache invalidated for user: ${userId}`);
        } catch (error) {
            logger.error('Cache invalidation error:', error);
        }
    }

    /**
     * Invalidate all caches for a user
     */
    async invalidateUser(userId: string): Promise<void> {
        if (!this.isConnected || !this.redis) return;

        try {
            const pattern = `*:${userId}`;
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        } catch (error) {
            logger.error('User cache invalidation error:', error);
        }
    }

    /**
     * Get cache metrics
     */
    getMetrics() {
        const total = this.metrics.hits + this.metrics.misses;
        return {
            ...this.metrics,
            hitRatio: total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + '%' : 'N/A',
            isConnected: this.isConnected
        };
    }

    /**
     * Health check
     */
    async isHealthy(): Promise<boolean> {
        if (!this.redis || !this.isConnected) return false;
        try {
            await this.redis.ping();
            return true;
        } catch {
            return false;
        }
    }
}

// Singleton instance
export const cacheService = new CacheService();
export default cacheService;
