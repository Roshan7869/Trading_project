# Docker Development Deployment Script for Trading Platform
# Usage: .\docker-dev.ps1 [command]
# Commands: start, stop, restart, logs, rebuild, clean, status

param(
    [Parameter(Position=0)]
    [string]$Command = "start"
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Show-Banner {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host "   Trading Platform - Docker Development" -ForegroundColor Yellow
    Write-Host "================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Start-Services {
    Write-Host "🚀 Starting all services..." -ForegroundColor Green
    
    # Build and start services
    docker compose up -d --build
    
    Write-Host ""
    Write-Host "✅ Services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Access points:" -ForegroundColor Yellow
    Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend:   http://localhost:4000" -ForegroundColor White
    Write-Host "   MongoDB:   mongodb://localhost:27017" -ForegroundColor White
    Write-Host "   Redis:     redis://localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 View logs: .\docker-dev.ps1 logs" -ForegroundColor Cyan
}

function Stop-Services {
    Write-Host "🛑 Stopping all services..." -ForegroundColor Yellow
    docker compose down
    Write-Host "✅ All services stopped." -ForegroundColor Green
}

function Restart-Services {
    Write-Host "🔄 Restarting all services..." -ForegroundColor Yellow
    docker compose restart
    Write-Host "✅ All services restarted." -ForegroundColor Green
}

function Show-Logs {
    param(
        [string]$Service = ""
    )
    
    if ($Service) {
        Write-Host "📋 Showing logs for $Service..." -ForegroundColor Cyan
        docker compose logs -f $Service
    } else {
        Write-Host "📋 Showing logs for all services..." -ForegroundColor Cyan
        docker compose logs -f
    }
}

function Rebuild-Services {
    Write-Host "🔨 Rebuilding all services (no cache)..." -ForegroundColor Yellow
    docker compose build --no-cache
    docker compose up -d
    Write-Host "✅ Rebuild complete!" -ForegroundColor Green
}

function Clean-Docker {
    Write-Host "🧹 Cleaning Docker resources..." -ForegroundColor Yellow
    
    # Stop all services
    docker compose down -v --remove-orphans
    
    # Remove dangling images
    docker image prune -f
    
    # Remove build cache
    docker builder prune -f
    
    Write-Host "✅ Cleanup complete!" -ForegroundColor Green
}

function Show-Status {
    Write-Host "📊 Service Status:" -ForegroundColor Cyan
    Write-Host ""
    docker compose ps
    Write-Host ""
    
    Write-Host "💾 Volume Usage:" -ForegroundColor Cyan
    docker volume ls --filter "name=trading_project"
    Write-Host ""
    
    Write-Host "🔍 Health Check:" -ForegroundColor Cyan
    
    # Check if services are healthy
    $services = @("trading-mongo", "trading-redis", "trading-backend", "trading-frontend")
    foreach ($service in $services) {
        $status = docker inspect --format='{{.State.Status}}' $service 2>$null
        if ($status -eq "running") {
            Write-Host "   ✅ $service is running" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $service is not running" -ForegroundColor Red
        }
    }
}

function Install-Dependencies {
    Write-Host "📦 Installing dependencies in containers..." -ForegroundColor Yellow
    
    # Frontend
    docker compose exec frontend npm install
    
    # Backend
    docker compose exec backend npm install
    
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
}

# Main Script
Show-Banner

switch ($Command.ToLower()) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "logs" { Show-Logs }
    "rebuild" { Rebuild-Services }
    "clean" { Clean-Docker }
    "status" { Show-Status }
    "install" { Install-Dependencies }
    default {
        Write-Host "Available commands:" -ForegroundColor Yellow
        Write-Host "  start    - Start all services" -ForegroundColor White
        Write-Host "  stop     - Stop all services" -ForegroundColor White
        Write-Host "  restart  - Restart all services" -ForegroundColor White
        Write-Host "  logs     - View logs for all services" -ForegroundColor White
        Write-Host "  rebuild  - Rebuild all services (no cache)" -ForegroundColor White
        Write-Host "  clean    - Clean all Docker resources" -ForegroundColor White
        Write-Host "  status   - Show service status" -ForegroundColor White
        Write-Host "  install  - Install dependencies in containers" -ForegroundColor White
    }
}
