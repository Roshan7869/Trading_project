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
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Redis Setup for Market Data
const redisSubscriber = createClient({ url: REDIS_URL });

redisSubscriber.on('error', (err) => console.error('Redis Client Error:', err));

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
}).catch(err => console.error('❌ Redis connection error:', err));

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
