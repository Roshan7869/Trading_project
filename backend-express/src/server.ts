import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
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
import { marketDataService } from './services/MarketDataService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 4000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/paper_trading';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/accounts', accountRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'paper-trading-backend' });
});

// MongoDB connection
mongoose.connect(MONGO_URL)
    .then(async () => {
        console.log('✅ MongoDB connected');

        // Seed test data for TEST_MODE
        const { seedTestData } = await import('./utils/testSeeder');
        await seedTestData();
    })
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Redis Setup for Market Data
const redisSubscriber = createClient({ url: REDIS_URL });

redisSubscriber.on('error', (err) => {
    console.error('Redis Client Error:', err.message);
});

// Mock market data for testing when Redis is unavailable
const MOCK_STOCKS = {
    'RELIANCE': 2450.50, 'TCS': 3680.75, 'INFY': 1545.30,
    'HDFCBANK': 1685.20, 'ICICIBANK': 1025.80, 'ITC': 445.65,
    'SBIN': 625.40, 'BHARTIARTL': 1220.90, 'HINDUNILVR': 2545.30, 'LT': 3420.75
};

function startMockMarketData() {
    console.log('📊 Starting MOCK market data (Redis unavailable)');

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
            io.emit('market_update', marketData);
        });
    }, 2000);
}

// Connect Redis and subscribe to market data
redisSubscriber.connect().then(() => {
    console.log('✅ Redis subscriber connected');

    redisSubscriber.subscribe('market_ticks', (message) => {
        try {
            const marketData = JSON.parse(message);

            // Update cache
            marketDataService.updatePrice(marketData);

            // Broadcast to all connected clients
            io.emit('market_update', marketData);

            // console.log('📊 Market update:', marketData.symbol, marketData.price);
        } catch (error) {
            console.error('Error parsing market data:', error);
        }
    });
}).catch(err => {
    console.warn('⚠️ Redis connection failed, using mock market data:', err.message);
    startMockMarketData();
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Send current market data cache to new client
    socket.emit('initial_market_data', marketDataService.getAllPrices());

    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
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

// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Express server running on port ${PORT}`);
    console.log(`📡 Socket.io server ready`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await mongoose.connection.close();
    await redisSubscriber.quit();
    httpServer.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
