import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import orderRoutes from './routes/order';
import portfolioRoutes from './routes/portfolio';
import watchlistRoutes from './routes/watchlist';
import accountRoutes from './routes/accounts';
import settingsRoutes from './routes/settings';
import { marketDataService } from './services/MarketDataService';
import { paperTradingEngine } from './services/PaperTradingEngine';
import { cacheService } from './services/CacheService';
import { globalErrorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import { StatusCodes } from 'http-status-codes';
import logger from './utils/logger';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

// Inject socket into trading engine
paperTradingEngine.setSocket(io);


const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/paper_trading';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Middleware
app.use(helmet()); // Security Headers
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Rate Limiter - Generous limit for development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/settings', settingsRoutes);

// Health check with cache metrics
app.get('/api/health', async (req, res) => {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = redisSubscriber.isOpen ? 'connected' : 'disconnected';
    const cacheHealth = await cacheService.isHealthy();
    const cacheMetrics = cacheService.getMetrics();
    const isHealthy = mongoStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        service: 'paper-trading-backend',
        dependencies: {
            mongo: mongoStatus,
            redis: redisStatus,
            cache: cacheHealth ? 'connected' : 'disconnected'
        },
        cache: cacheMetrics,
        timestamp: new Date().toISOString()
    });
});

// API endpoint to get current market prices
app.get('/api/market/prices', (req, res) => {
    const prices = marketDataService.getAllPrices();
    res.json({ prices });
});

app.get('/api/market/price/:symbol', (req, res) => {
    const { symbol } = req.params;
    const price = marketDataService.getPrice(symbol);

    if (!price) {
        return res.status(404).json({ error: 'Symbol not found' });
    }

    res.json(price);
});

// API endpoint to get historical OHLC candles
app.get('/api/market/history/:symbol', (req, res) => {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const candles = marketDataService.getCandles(symbol, limit);

    if (candles.length === 0) {
        return res.status(404).json({ error: 'No candle data available for symbol' });
    }

    res.json({ symbol, timeframe: '1m', candles });
});

// 404 Handler for undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, StatusCodes.NOT_FOUND));
});

// Global Error Handler
app.use(globalErrorHandler);

// MongoDB connection
mongoose.connect(MONGO_URL)
    .then(async () => {
        logger.info('✅ MongoDB connected');

        // Seed test data for TEST_MODE
        const { seedTestData } = await import('./utils/testSeeder');
        await seedTestData();
    })
    .catch(err => logger.error(`❌ MongoDB connection error: ${err}`));

// Redis Setup for Market Data
const redisSubscriber = createClient({ url: REDIS_URL });

redisSubscriber.on('error', (err) => {
    logger.error(`Redis Client Error: ${err.message}`);
});

// Mock market data for testing when Redis is unavailable
const MOCK_STOCKS = {
    'RELIANCE': 2450.50, 'TCS': 3680.75, 'INFY': 1545.30,
    'HDFCBANK': 1685.20, 'ICICIBANK': 1025.80, 'ITC': 445.65,
    'SBIN': 625.40, 'BHARTIARTL': 1220.90, 'HINDUNILVR': 2545.30, 'LT': 3420.75
};

function startMockMarketData() {
    logger.warn('📊 Starting MOCK market data (Redis unavailable)');

    // Initialize with base prices
    Object.entries(MOCK_STOCKS).forEach(([symbol, price]) => {
        marketDataService.updatePrice({
            symbol, price, change: 0,
            timestamp: new Date().toISOString(),
            volume: 100000, source: 'mock'
        });
    });

    // Simulate price updates every 2 seconds
    setInterval(() => {
        Object.entries(MOCK_STOCKS).forEach(([symbol, basePrice]) => {
            const change = (Math.random() - 0.5) * 0.5; // -0.25% to +0.25%
            const newPrice = basePrice * (1 + change / 100);
            const marketData = {
                symbol,
                price: Math.round(newPrice * 100) / 100,
                change: Math.round(change * 100) / 100,
                timestamp: new Date().toISOString(),
                volume: Math.floor(Math.random() * 500000),
                source: 'mock'
            };
            marketDataService.updatePrice(marketData);
            paperTradingEngine.processPendingOrders(marketData.symbol, marketData.price);
            io.emit('market_update', marketData);
        });
    }, 2000);
}

// Connect Redis and subscribe to market data
// Connect Redis and subscribe to market data
const connectRedis = async () => {
    try {
        // Create a promise that rejects after a timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Redis connection timeout')), 2000);
        });

        // Race between connection and timeout
        await Promise.race([
            redisSubscriber.connect(),
            timeoutPromise
        ]);

        logger.info('✅ Redis subscriber connected');

        await redisSubscriber.subscribe('market_ticks', (message) => {
            try {
                if (mongoose.connection.readyState !== 1) return;

                const marketData = JSON.parse(message);
                marketDataService.updatePrice(marketData);
                paperTradingEngine.processPendingOrders(marketData.symbol, marketData.price);
                io.emit('market_update', marketData);
            } catch (error) {
                logger.error(`Error parsing market data: ${error}`);
            }
        });
    } catch (err: any) {
        logger.warn(`⚠️ Redis connection failed/timed out, switching to MOCK data: ${err.message}`);
        // If connection failed, ensure we're disconnected to stop retries if client is active
        if (redisSubscriber.isOpen) {
            await redisSubscriber.disconnect();
        }
        startMockMarketData();
    }
};

// Start initialization
connectRedis();

// Socket.io connection handling
io.on('connection', (socket) => {
    logger.info(`🔌 Client connected: ${socket.id}`);

    // Send current market data cache to new client
    socket.emit('initial_market_data', marketDataService.getAllPrices());

    socket.on('disconnect', () => {
        logger.info(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Start server
httpServer.listen(PORT, () => {
    logger.info(`🚀 Express server running on port ${PORT}`);
    logger.info(`📡 Socket.io server ready`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    await redisSubscriber.quit();
    httpServer.close(() => {
        logger.info('Server closed');
        process.exit(0);
    });
});

