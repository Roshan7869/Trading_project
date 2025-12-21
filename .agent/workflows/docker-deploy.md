---
description: Deploy Trading Platform with Docker
---

# Docker Deployment Workflow

This workflow guides you through deploying the Trading Platform locally using Docker.

## Prerequisites

1. Docker Desktop must be installed and running
2. Ensure `.env` file exists with proper configuration (copy from `.env.example` if needed)

## Quick Start

// turbo
1. **Start all services** (builds images if needed):
   ```powershell
   docker compose up -d --build
   ```

// turbo
2. **Check service status**:
   ```powershell
   docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```

3. **View logs** (for debugging):
   ```powershell
   docker compose logs -f
   ```

## Access Points

| Service   | URL                           |
|-----------|-------------------------------|
| Frontend  | http://localhost:3000         |
| Backend   | http://localhost:4000         |
| API Health| http://localhost:4000/api/health |
| MongoDB   | mongodb://localhost:27017     |
| Redis     | redis://localhost:6379        |

## Common Commands

### Stop all services
// turbo
```powershell
docker compose down
```

### Restart a specific service
```powershell
docker compose restart frontend
```

### Rebuild a specific service
```powershell
docker compose up -d --build frontend
```

### View logs for a specific service
```powershell
docker compose logs -f backend
```

### Clean up (remove volumes and images)
```powershell
docker compose down -v --rmi all
```

## Using the Helper Script

A PowerShell helper script is available at `docker-dev.ps1`:

```powershell
.\docker-dev.ps1 start     # Start all services
.\docker-dev.ps1 stop      # Stop all services
.\docker-dev.ps1 restart   # Restart all services
.\docker-dev.ps1 logs      # View logs
.\docker-dev.ps1 rebuild   # Rebuild all services (no cache)
.\docker-dev.ps1 clean     # Clean Docker resources
.\docker-dev.ps1 status    # Show service status
```

## Hot Reload

The development setup supports hot reload:

- **Frontend**: Changes to files in `app/`, `components/`, `context/`, `hooks/`, `lib/` are instantly reflected (Turbopack enabled)
- **Backend**: Changes to TypeScript files in `src/` trigger automatic restart (nodemon)
- **Data Engine**: Changes to Python files require manual container restart

## Troubleshooting

### Containers not starting
1. Check Docker Desktop is running
2. Check for port conflicts: `netstat -an | findstr "3000\|4000\|27017\|6379"`
3. View detailed logs: `docker compose logs service-name`

### Slow file watching on Windows
File watching uses polling mode for Docker compatibility. This is already configured in the setup.

### MongoDB connection issues
Ensure the container uses `mongo:27017` (not `localhost:27017`) in the Docker network.
