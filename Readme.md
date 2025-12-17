# Paper Trading Platform

A production-grade paper trading platform with **Groww-inspired UI/UX** and **Angel One SmartAPI integration** for real-time market data. Built with modern web technologies for learning stock trading without financial risk.

![Platform](https://img.shields.io/badge/Platform-Paper_Trading-success)
![Frontend](https://img.shields.io/badge/Frontend-Next.js_15-blue)
![Backend](https://img.shields.io/badge/Backend-Express.js-green)
![Data](https://img.shields.io/badge/Data-Angel_One_SmartAPI-orange)


## Overview

This platform simulates real stock market trading, allowing users to:
- Practice trading with **Rs. 1,00,000 virtual currency**
- Track real-time prices of 10 major NSE stocks
- Build and monitor a portfolio
- Learn market dynamics risk-free

### Key Highlights

| Feature | Description |
|---------|-------------|
| **Real Market Data** | Live prices via Angel One SmartAPI WebSocket |
| **Simulation Fallback** | Random walk algorithm when API unavailable |
| **Instant Execution** | Orders execute at current market price |
| **Portfolio Tracking** | Real-time P&L calculation |
| **Groww-Inspired UI** | Clean, modern interface |


## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                        │
│  Port: 3000 | TypeScript | Tailwind CSS | Socket.io Client          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket (Socket.io)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Express.js)                           │
│  Port: 4000 | JWT Auth | MongoDB | Redis Subscriber | Socket.io     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Redis Pub/Sub
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATA ENGINE (Python 3)                         │
│  Angel One SmartAPI | WebSocket V2 | Simulation Fallback             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌─────────────┐                 ┌─────────────┐
            │    Redis    │                 │   MongoDB   │
            │  Port: 6379 │                 │ Port: 27017 │
            └─────────────┘                 └─────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS | User interface |
| **Backend** | Express.js, Node.js, Socket.io | API & real-time |
| **Database** | MongoDB, Mongoose | Data persistence |
| **Cache/Pub-Sub** | Redis | Market data streaming |
| **Data Engine** | Python 3, Angel One SmartAPI | Real-time prices |


## Features

### User Management
- JWT-based authentication
- Bcrypt password hashing
- Virtual wallet with Rs. 1,00,000 starting balance

### Trading Features
- **Buy/Sell Orders** - Instant market order execution
- **Portfolio** - Real-time holdings with P&L
- **Order History** - Complete transaction log
- **Watchlist** - Track favorite stocks

### Market Data
- **Live Mode**: Real-time data from Angel One SmartAPI
- **Simulate Mode**: Random walk price simulation
- **Auto Mode**: Automatic fallback when API unavailable

### Supported Stocks (NSE)

| Symbol | Company | Symbol | Company |
|--------|---------|--------|---------|
| RELIANCE | Reliance Industries | ITC | ITC Ltd |
| TCS | Tata Consultancy | SBIN | State Bank of India |
| INFY | Infosys | BHARTIARTL | Bharti Airtel |
| HDFCBANK | HDFC Bank | HINDUNILVR | Hindustan Unilever |
| ICICIBANK | ICICI Bank | LT | Larsen & Toubro |


## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- MongoDB
- Redis
- Angel One Trading Account (optional, for live data)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd Paper_Trading

# Install backend dependencies
cd backend-express
npm install

# Install frontend dependencies
cd ../frontend-nextjs
npm install

# Install data engine dependencies
cd ../data-engine
pip install -r requirements.txt
```

### Configuration

1. **Backend** (`backend-express/.env`):
   ```env
   PORT=4000
   MONGODB_URI=mongodb://localhost:27017/paper_trading
   JWT_SECRET=your_secret_key
   REDIS_URL=redis://localhost:6379
   ```

2. **Data Engine** (`data-engine/.env`):
   ```env
   REDIS_URL=redis://localhost:6379
   
   # Optional: For live market data
   ANGEL_ONE_API_KEY=your_api_key
   ANGEL_ONE_CLIENT_CODE=your_client_code
   ANGEL_ONE_PIN=your_pin
   ANGEL_ONE_TOTP_SECRET=your_totp_secret
   ```

### Running the Application

**Option 1: Using PowerShell Script (Windows)**
```powershell
.\start_project.ps1
```

**Option 2: Run Services Individually**

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start MongoDB
mongod

# Terminal 3: Start Backend
cd backend-express
npm run dev

# Terminal 4: Start Data Engine
cd data-engine
python market_simulator.py --mode=simulate  # or --mode=live

# Terminal 5: Start Frontend
cd frontend-nextjs
npm run dev
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000


## Project Structure

```
Paper_Trading/
├── backend-express/           # Express.js API server
│   ├── src/
│   │   ├── controllers/       # Request handlers
│   │   ├── models/            # MongoDB schemas
│   │   │   ├── User.ts
│   │   │   ├── Order.ts
│   │   │   ├── Portfolio.ts
│   │   │   ├── Position.ts
│   │   │   └── Watchlist.ts
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth middleware
│   │   └── server.ts          # Entry point
│   └── package.json
│
├── data-engine/               # Python market data service
│   ├── market_simulator.py    # Main entry (live/simulate modes)
│   ├── angel_one_client.py    # SmartAPI authentication
│   ├── websocket_handler.py   # WebSocket V2 streaming
│   ├── symbol_mapper.py       # Stock token mapping
│   ├── config.py              # Configuration
│   └── requirements.txt
│
├── frontend-nextjs/           # Next.js web application
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── dashboard/         # Trading dashboard
│   │   ├── stocks/            # Stock details
│   │   ├── orders/            # Order history
│   │   ├── watchlist/         # User watchlist
│   │   ├── login/             # Authentication
│   │   └── register/
│   ├── components/            # Reusable UI components
│   ├── context/               # React contexts (Auth, Market)
│   ├── lib/                   # API utilities
│   └── package.json
│
├── start_project.ps1          # Windows startup script
└── Readme.md
```


## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and get JWT |

### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |
| GET | `/api/user/wallet` | Get wallet balance |

### Trading

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/order/place` | Place buy/sell order |
| GET | `/api/order/history` | Get order history |
| GET | `/api/portfolio` | Get user portfolio |

### Watchlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist` | Get watchlist |
| POST | `/api/watchlist/add` | Add stock to watchlist |
| POST | `/api/watchlist/remove` | Remove from watchlist |

### Market

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/prices` | Get all current prices |
| GET | `/api/market/price/:symbol` | Get specific stock price |


## Data Engine Modes

The data engine supports three modes:

| Mode | Command | Description |
|------|---------|-------------|
| **Auto** | `python market_simulator.py` | Detects credentials, uses live if available |
| **Live** | `python market_simulator.py --mode=live` | Real data from Angel One |
| **Simulate** | `python market_simulator.py --mode=simulate` | Random walk simulation |

### Angel One SmartAPI Setup

1. Create account at [Angel One](https://www.angelone.in/)
2. Register at [SmartAPI](https://smartapi.angelone.in/)
3. Create a "Trading API" app
4. Set up 2FA and note the TOTP secret
5. Add credentials to `data-engine/.env`


## Database Schema

### MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts, wallet balance |
| `orders` | Trade order history |
| `portfolios` | User holdings summary |
| `positions` | Individual stock positions |
| `watchlists` | User stock watchlists |

### Redis Channels

| Channel | Purpose |
|---------|---------|
| `market_ticks` | Real-time price updates |


## How It Works

```
1. User logs in via Frontend
           │
           ▼
2. Frontend connects to Backend WebSocket
           │
           ▼
3. Data Engine streams prices to Redis
           │
           ▼
4. Backend subscribes to Redis, broadcasts to Frontend
           │
           ▼
5. User places order → Backend validates → MongoDB transaction
           │
           ▼
6. Portfolio & wallet updated atomically
```

### Order Execution Flow

1. User submits buy/sell order
2. Backend validates:
   - Sufficient wallet balance (buy)
   - Sufficient holdings (sell)
3. MongoDB transaction:
   - Creates order record
   - Updates/creates position
   - Adjusts wallet balance
4. Response sent to user


## Security

- **JWT Authentication** - Secure token-based auth
- **Bcrypt Hashing** - Password encryption
- **MongoDB Transactions** - Atomic order execution
- **CORS** - Cross-origin protection
- **Input Validation** - Request sanitization


## UI/UX Design

Inspired by [Groww](https://groww.in/) with:

| Element | Style |
|---------|-------|
| **Primary Color** | Emerald Green (#10B981) |
| **Danger Color** | Rose Red (#F43F5E) |
| **Background** | White + Light Gray (#F3F4F6) |
| **Font** | Inter |
| **Corners** | Large radius (rounded-2xl) |
| **Design** | Minimalist, clean whitespace |


## Development

### Backend Development

```bash
cd backend-express
npm run dev      # Development with hot reload
npm run build    # Compile TypeScript
npm start        # Production
```

### Frontend Development

```bash
cd frontend-nextjs
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint check
```

### Data Engine Development

```bash
cd data-engine
python market_simulator.py --mode=simulate
python angel_one_client.py  # Test authentication
```


## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redis connection failed | Start Redis: `redis-server` |
| MongoDB connection failed | Start MongoDB: `mongod` |
| WebSocket errors | Check Redis is running |
| Live mode not working | Verify Angel One credentials |
| Unicode errors (Windows) | Automatically handled in code |


## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request


## License

MIT License - Feel free to use for learning and development!

---

**Built with Next.js, Express.js, Python, Redis, MongoDB, and Angel One SmartAPI**
