# 📊 Paper Trading Platform

A production-grade paper trading platform with a **Groww-inspired UI/UX**, built with modern web technologies.

## 🏛️ Architecture

### Tech Stack

```
╭───────────────────────────────────╮
│  Frontend: Next.js 14+ (App Router)  │
│  Port: 3000                           │
│  - TypeScript                        │
│  - Tailwind CSS (Groww Design)       │
│  - Socket.io Client (Real-time)      │
╰───────────────────────────────────╯
         │
         │ WebSocket (Socket.io)
         │
         v
╭───────────────────────────────────╮
│  Backend: Express.js + Node.js       │
│  Port: 4000                           │
│  - JWT Authentication                │
│  - MongoDB (Mongoose)                │
│  - Redis Subscriber                  │
│  - Socket.io Server                  │
╰───────────────────────────────────╯
         │
         │ Redis Pub/Sub
         │
         v
╭───────────────────────────────────╮
│  Data Engine: Python 3               │
│  - Market Data Simulator             │
│  - Redis Publisher                   │
│  - Random Walk Algorithm             │
╰───────────────────────────────────╯

         Redis (Port 6379)
         MongoDB (Port 27017)
```

## ✨ Features

### 👤 User Management
- User registration and login with JWT
- Starting virtual balance: **₹1,00,000**
- Secure password hashing with bcrypt

### 💹 Trading Features
- **Buy/Sell Orders**: Instant order execution
- **Portfolio Tracking**: Real-time portfolio value calculation
- **Order History**: Complete transaction log
- **Watchlist**: Track favorite stocks

### 📈 Real-Time Market Data
- Live price updates via WebSocket
- 10 Indian stocks simulated:
  - RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK
  - ITC, SBIN, BHARTIARTL, HINDUNILVR, LT
- Market data updates every 2 seconds

### 🎨 Groww-Style UI/UX
- **Colors**:
  - Primary (Buy): Emerald Green (#10B981)
  - Danger (Sell): Rose Red (#F43F5E)
  - Background: White (#FFFFFF) with Light Gray (#F3F4F6)
- **Design**: Minimalist, clean, ample whitespace
- **Typography**: Inter font family
- **Shapes**: Large border-radius (rounded-2xl)

## 🚀 Quick Start

### 1. Start All Services

```bash
cd /app
chmod +x start-all.sh
./start-all.sh
```

This will start:
1. Redis (Port 6379)
2. Express Backend (Port 4000)
3. Python Data Engine
4. Next.js Frontend (Port 3000)

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000

### 3. Create an Account

1. Go to http://localhost:3000
2. Click "Get Started" or "Register"
3. Fill in your details
4. You'll start with ₹1,00,000 virtual cash!

## 📁 Project Structure

```
/app/
├── backend-express/       # Express.js backend
│   ├── src/
│   │   ├── models/          # MongoDB models
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth middleware
│   │   └── server.ts        # Main server
│   ├── package.json
│   └── tsconfig.json
│
├── data-engine/           # Python market simulator
│   ├── market_simulator.py
│   └── requirements.txt
│
├── frontend-nextjs/       # Next.js frontend
│   ├── app/                # App router pages
│   ├── components/         # React components
│   ├── context/            # React contexts
│   ├── lib/                # API utilities
│   ├── package.json
│   └── tailwind.config.ts
│
└── start-all.sh          # Startup script
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### User
- `GET /api/user/profile` - Get user profile
- `GET /api/user/wallet` - Get wallet balance

### Orders
- `POST /api/order/place` - Place buy/sell order
- `GET /api/order/history` - Get order history

### Portfolio
- `GET /api/portfolio` - Get user portfolio

### Watchlist
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist/add` - Add symbol
- `POST /api/watchlist/remove` - Remove symbol

### Market Data
- `GET /api/market/prices` - Get all current prices
- `GET /api/market/price/:symbol` - Get specific stock price

## 🛠️ Development

### Run Services Individually

**Backend:**
```bash
cd /app/backend-express
npm run dev
```

**Data Engine:**
```bash
cd /app/data-engine
python3 market_simulator.py
```

**Frontend:**
```bash
cd /app/frontend-nextjs
npm run dev
```

### View Logs

```bash
# Express Backend
tail -f /tmp/express-backend.log

# Python Data Engine
tail -f /tmp/python-data-engine.log

# Next.js Frontend
tail -f /tmp/nextjs-frontend.log
```

## 💾 Database

### MongoDB Collections

1. **users**: User accounts and wallet balances
2. **orders**: Trading order history
3. **portfolios**: User holdings and positions
4. **watchlists**: User watchlists

### Redis Channels

- `market_ticks`: Real-time market data stream

## 🎓 How It Works

1. **Python Data Engine** generates simulated market data using a random walk algorithm
2. Market data is published to **Redis** channel `market_ticks`
3. **Express Backend** subscribes to Redis and receives market updates
4. Backend broadcasts updates to connected **Next.js** clients via **Socket.io**
5. Frontend displays live prices and updates in real-time
6. Users place orders through the UI
7. Backend validates and executes orders with **MongoDB transactions**
8. Portfolio and wallet balances are updated atomically

## 🔒 Security Features

- JWT-based authentication
- Bcrypt password hashing
- MongoDB transactions for order execution
- Input validation and sanitization
- CORS configuration

## 💡 Key Implementation Details

### Order Execution

- Uses MongoDB sessions and transactions
- Atomic wallet balance updates
- Prevents negative balances
- Validates holdings before selling
- Calculates average purchase price

### Real-time Updates

- Socket.io for WebSocket connections
- Redis Pub/Sub for service communication
- Efficient market data caching
- Automatic reconnection handling

### UI/UX Design

- Groww-inspired color scheme
- Responsive design (mobile & desktop)
- Real-time price updates
- Smooth transitions and animations
- Clean, minimalist interface

## 📝 License

MIT License - Feel free to use for learning and development!

---

**Built with ❤️ using Next.js, Express.js, Python, Redis, and MongoDB**
