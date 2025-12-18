# Paper Trading Platform

A production-grade paper trading platform with **Groww-inspired UI/UX** and **Angel One SmartAPI integration** for real-time market data. Built with modern web technologies for learning stock trading without financial risk.

![Platform](https://img.shields.io/badge/Platform-Paper_Trading-success)
![Frontend](https://img.shields.io/badge/Frontend-Next.js_15-blue)
![Backend](https://img.shields.io/badge/Backend-Express.js-green)
![Data](https://img.shields.io/badge/Data-Angel_One_SmartAPI-orange)

## Overview

This platform simulates real stock market trading, allowing users to:
- Practice trading with **₹1,00,000 virtual currency** (auto-credited upon registration)
- Track real-time prices of 10 major NSE stocks
- Place **Market Orders** instantly via a simplified Quick Trade widget
- Monitor **Real-time P&L** on positions as market prices change
- Experience a professional dashboard with wallet and portfolio analysis

### Key Highlights

| Feature | Description |
|---------|-------------|
| **Real Market Data** | Live prices via Angel One SmartAPI WebSocket |
| **Simulation Fallback** | Random walk algorithm or Mock Data when API/Redis unavailable |
| **Instant Execution** | Orders execute at current market price instantly |
| **Real-time P&L** | Positions update live with market ticks via Socket.io |
| **Developer Friendly** | Includes a **Test Mode** to bypass auth and mock DB/Redis |
| **Auto-Onboarding** | New users get a trading account and capital automatically |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js 15)                        │
│  Port: 3000 | TypeScript | Tailwind CSS | Socket.io Client          │
│  Contexts: AuthContext, MarketContext (Live P&L Tracking)           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket (Socket.io)
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Express.js)                           │
│  Port: 4000 | JWT Auth | MongoDB | Redis Subscriber | Socket.io     │
│  Services: OrderService, PositionService, MarketDataService         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Redis Pub/Sub (Channel: market_ticks)
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

## Features

### User Management
- **Auto-Registration**: Sign up and automatically get a trading account with ₹1,00,000.
- **JWT Authentication**: Secure session management.
- **Test Mode**: Bypass login for rapid development (configurable in `auth.ts`).

### Trading Features
- **Quick Trade Widget**: Simplified "Buy/Sell" interface (Symbol, Qty, Type).
- **Smart Order Routing**: Backend `OrderService` handles symbol-to-token mapping automatically.
- **Real-Time Portfolio**: Watch your invested value and P&L change tick-by-tick.
- **Market Overview**: Live grid of supported stocks with price changes.

### Market Data Modes
1.  **Live Mode**: Connects to Angel One SmartAPI for real NSE data.
2.  **Simulate Mode**: Python engine generates random walk price movements.
3.  **Mock Mode (Fallback)**: If Redis is down, Backend generates internal mock data for testing.

## Quick Start

### Prerequisites
- **Docker Desktop** (Recommended)
OR
- **Node.js 18+**, **MongoDB**, **Redis**, **Python 3.10+**

### Running the Application

**Option 1: Docker Compose (Recommended)**
This is the easiest way to run the entire backend, frontend, databases, and data engine with a single command. It eliminates all manual setup and dependency issues.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop).
2. Open a terminal in the project root.
3. Run:
   ```bash
   docker-compose up --build
   ```
4. Access the application:
   *   **Frontend**: http://localhost:3000
   *   **Backend API**: http://localhost:4000
   *   **MongoDB & Redis**: Managed automatically in containers.

**Option 2: Using PowerShell Script (Windows)**
This script starts all components individually (requires new terminals for each).
```powershell
.\start_project.ps1
```

**Option 3: Manual Start**
Refer to the `start_project.ps1` script for the individual commands to start Redis, MongoDB, Backend, Data Engine, and Frontend.

## API Reference

### Orders
- **POST** `/api/order/quick`: Simplified order placement.
    - Body: `{ symbol: "RELIANCE", type: "BUY", quantity: 10 }`
- **POST** `/api/order/place`: Advanced order placement (Limit/Stop).

### Portfolio
- **GET** `/api/portfolio`: Returns positions with calculated **real-time P&L**.
- **GET** `/api/user/wallet`: Returns current available balance.

### Market Data
- **GET** `/api/market/prices`: Snapshot of all current prices.
- **Socket.io `market_update`**: Real-time stream of price changes.

## Developer Guide

### Test Mode
The backend includes a `TEST_MODE` in `src/middleware/auth.ts` and `src/utils/testSeeder.ts`.
- **Function**: Bypasses JWT auth, auto-creates a test user/account on startup.
- **Usage**: Set `TEST_MODE = true` in environment or code to test without logging in.

### Project Structure
- `backend-express/src/services/OrderService.ts`: Bridges frontend simple orders to complex trading engine.
- `backend-express/src/utils/symbolMapper.ts`: Maps stock symbols (RELIANCE) to Angel One Tokens.
- `frontend-nextjs/context/MarketContext.tsx`: Handles Socket.io connections and live P&L calculations.
- `docker-compose.yml`: Docker orchestration for the entire stack.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **MongoDB timeout** | Use Docker (Option 1). If running locally, ensure `mongod` is on port 27017. |
| **Redis connection failed** | Use Docker. Backend will auto-switch to **Mock Market Data** if Redis is missing locally. |
| **"EADDRINUSE: 4000"** | Kill existing node processes: `taskkill /F /IM node.exe` |

## License

MIT License
