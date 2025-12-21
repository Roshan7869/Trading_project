# Local Execution Guide

This guide explains how to run the Trading Platform locally with the smooth loading pipeline.

## 🚀 Optimized Startup

We use `start-optimized.ps1` to launch services in a specific order to prevent resource contention and ensure everything is ready before the frontend loads.

### 1. Prerequisites
- Docker Desktop (Running)
- Node.js (v18+)
- Python (v3.9+)

### 2. Start the Platform
Run the following command in PowerShell:

```powershell
.\start-optimized.ps1
```

**What this does:**
1.  **Infra Phase**: Starts MongoDB and Redis in Docker (Background). Waits for health checks.
2.  **Backend Phase**: Starts Express API in a new terminal. Waits for API health `http://localhost:4000/api/health`.
3.  **Data Phase**: Starts Python Data Engine & Strategy Engine in a new terminal.
4.  **Frontend Phase**: Starts Next.js Dev Server (heavy task) last. Waits for `http://localhost:3000`.

### 3. Verification
Once the script says **"All Services Started!"**, you can access:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)

## 🛠 Troubleshooting

- **Ports in use?**
  Run `.\docker-dev.ps1 stop` or `docker compose down` to clear stuck containers.
- **Frontend stuck loading?**
  The first compile of Next.js takes time. Check the "Frontend Next.js" terminal window for progress.
- **Data not updating?**
  Check the "Data Engine" terminal. Ensure it connected to Redis/Mongo successfully.

## ⚡ Performance Tips
- The `start-optimized.ps1` script is designed to be the *fastest* way to get from cold boot to working app.
- Do not run `npm run dev` manually unless you only need the frontend and have other services running.
- Use `.\docker-dev.ps1` for full Docker container mode if you don't want local terminals opening.
