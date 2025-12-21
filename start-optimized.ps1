# ================================================
# Trading Platform - Optimized Sequential Startup
# ================================================
# This script starts services in sequence with health checks
# to distribute loading time and ensure proper startup order.
# ================================================

param(
    [Parameter(Position=0)]
    [string]$Mode = "docker",  # docker, local, or hybrid
    [switch]$SkipBuild,
    [switch]$ShowDetails,
    [int]$HealthTimeout = 60   # Maximum seconds to wait for health check
)

$ErrorActionPreference = "Continue"  # Don't stop on Docker stderr output
$ProgressPreference = 'SilentlyContinue'  # Speed up Invoke-WebRequest

# Color functions
function Write-Step { param([string]$msg) Write-Host "`n[STEP] $msg" -ForegroundColor Cyan }
function Write-Success { param([string]$msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn { param([string]$msg) Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err { param([string]$msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Info { param([string]$msg) Write-Host "[INFO] $msg" -ForegroundColor White }

# Timer functions for performance tracking
$global:StepTimers = @{}
$global:TotalStartTime = $null

function Start-Timer { 
    param([string]$Name) 
    $global:StepTimers[$Name] = Get-Date 
}

function Stop-Timer { 
    param([string]$Name)
    if ($global:StepTimers.ContainsKey($Name)) {
        $elapsed = (Get-Date) - $global:StepTimers[$Name]
        return [math]::Round($elapsed.TotalSeconds, 1)
    }
    return 0
}

# Banner
function Show-Banner {
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Magenta
    Write-Host "     Trading Platform - Optimized Sequential Start            " -ForegroundColor Magenta
    Write-Host "          Distributed Loading for Better Performance          " -ForegroundColor Magenta
    Write-Host "==============================================================" -ForegroundColor Magenta
    Write-Host ""
}

# Health check function with timeout
function Wait-ForHealthy {
    param(
        [string]$Name,
        [string]$HealthCommand,
        [int]$TimeoutSeconds = $HealthTimeout,
        [int]$DelayBetweenChecks = 2
    )
    
    Write-Info "Waiting for $Name to be healthy (timeout: $TimeoutSeconds seconds)..."
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        try {
            $result = Invoke-Expression $HealthCommand 2>$null
            if ($LASTEXITCODE -eq 0 -or $result) {
                $elapsed = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
                Write-Success "$Name is healthy! (took $elapsed seconds)"
                return $true
            }
        } catch {
            # Continue waiting
        }
        Start-Sleep -Seconds $DelayBetweenChecks
    }
    
    Write-Err "$Name failed to become healthy within $TimeoutSeconds seconds"
    return $false
}

# HTTP health check
function Wait-ForHttpEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = $HealthTimeout
    )
    
    Write-Info "Waiting for $Name HTTP endpoint: $Url"
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                $elapsed = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
                Write-Success "$Name is responding! (took $elapsed seconds)"
                return $true
            }
        } catch {
            # Continue waiting
        }
        Start-Sleep -Seconds 2
    }
    
    Write-Warn "$Name not responding at $Url (may still be starting)"
    return $false
}

# ================================================
# DOCKER MODE - Sequential Container Startup
# ================================================
function Start-DockerSequential {
    $global:TotalStartTime = Get-Date
    
    Write-Step "PHASE 1: Infrastructure Services"
    Write-Host "   Starting MongoDB and Redis first (required by all other services)" -ForegroundColor Gray
    
    # Step 1: Start MongoDB
    Start-Timer "mongo"
    Write-Host "`n   Starting MongoDB..." -ForegroundColor Yellow
    
    $buildFlag = ""
    if (-not $SkipBuild) { 
        $buildFlag = "--build" 
    }
    docker compose up -d $buildFlag mongo 2>&1 | Out-Null
    
    $mongoHealthy = Wait-ForHealthy -Name "MongoDB" -HealthCommand 'docker exec trading-mongo mongosh --eval "db.adminCommand({ping:1})" --quiet 2>$null; $LASTEXITCODE -eq 0'
    if (-not $mongoHealthy) {
        Write-Err "MongoDB failed to start. Check logs: docker compose logs mongo"
        return
    }
    $mongoTime = Stop-Timer "mongo"
    
    # Step 2: Start Redis
    Start-Timer "redis"
    Write-Host "`n   Starting Redis..." -ForegroundColor Yellow
    
    docker compose up -d $buildFlag redis 2>&1 | Out-Null
    
    $redisHealthy = Wait-ForHealthy -Name "Redis" -HealthCommand 'docker exec trading-redis redis-cli ping 2>$null'
    if (-not $redisHealthy) {
        Write-Err "Redis failed to start. Check logs: docker compose logs redis"
        return
    }
    $redisTime = Stop-Timer "redis"
    
    Write-Success "Infrastructure ready! MongoDB: $mongoTime sec, Redis: $redisTime sec"
    
    # ================================================
    Write-Step "PHASE 2: Backend Service"
    Write-Host "   Starting Express backend (depends on MongoDB + Redis)" -ForegroundColor Gray
    
    Start-Timer "backend"
    Write-Host "`n   Building and starting Backend..." -ForegroundColor Yellow
    
    docker compose up -d $buildFlag backend 2>&1 | Out-Null
    
    # Wait for backend container to be running
    Start-Sleep -Seconds 5
    
    $backendHealthy = Wait-ForHttpEndpoint -Name "Backend API" -Url "http://localhost:4000/api/health" -TimeoutSeconds 90
    $backendTime = Stop-Timer "backend"
    
    if ($backendHealthy) {
        Write-Success "Backend API ready! ($backendTime sec)"
    } else {
        Write-Warn "Backend may still be starting... continuing with other services"
    }
    
    # ================================================
    Write-Step "PHASE 3: Data Services"
    Write-Host "   Starting Data Engine and Strategy Engine (Python services)" -ForegroundColor Gray
    
    # Start both Python services
    Start-Timer "data-services"
    Write-Host "`n   Starting Data Engine..." -ForegroundColor Yellow
    docker compose up -d $buildFlag data-engine 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    
    Write-Host "   Starting Strategy Engine..." -ForegroundColor Yellow
    docker compose up -d $buildFlag strategy-engine 2>&1 | Out-Null
    Start-Sleep -Seconds 3
    
    $dataTime = Stop-Timer "data-services"
    Write-Success "Data services started! ($dataTime sec)"
    
    # ================================================
    Write-Step "PHASE 4: Frontend Service"
    Write-Host "   Starting Next.js frontend (heaviest service, loaded last)" -ForegroundColor Gray
    
    Start-Timer "frontend"
    Write-Host "`n   Building and starting Frontend (this may take a while)..." -ForegroundColor Yellow
    
    docker compose up -d $buildFlag frontend 2>&1 | Out-Null
    
    $frontendHealthy = Wait-ForHttpEndpoint -Name "Frontend" -Url "http://localhost:3000" -TimeoutSeconds 120
    $frontendTime = Stop-Timer "frontend"
    
    if ($frontendHealthy) {
        Write-Success "Frontend ready! ($frontendTime sec)"
    } else {
        Write-Warn "Frontend is compiling... check logs with: docker compose logs -f frontend"
    }
    
    # ================================================
    Show-Summary
}

# ================================================
# LOCAL MODE - Sequential Local Process Startup
# ================================================
function Start-LocalSequential {
    $global:TotalStartTime = Get-Date
    
    Write-Step "PHASE 1: Check Prerequisites"
    
    # Check if Node.js is installed
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        Write-Err "Node.js is not installed. Please install Node.js first."
        return
    }
    Write-Success "Node.js: $nodeVersion"
    
    # Check if Python is installed
    $pythonVersion = python --version 2>$null
    if (-not $pythonVersion) {
        Write-Err "Python is not installed. Please install Python first."
        return
    }
    Write-Success "Python: $pythonVersion"
    
    # ================================================
    Write-Step "PHASE 2: Start Infrastructure (Docker)"
    Write-Host "   Starting MongoDB and Redis containers" -ForegroundColor Gray
    
    Start-Timer "infra"
    docker compose up -d mongo redis 2>&1 | Out-Null
    
    $mongoHealthy = Wait-ForHealthy -Name "MongoDB" -HealthCommand 'docker exec trading-mongo mongosh --eval "db.adminCommand({ping:1})" --quiet 2>$null; $LASTEXITCODE -eq 0'
    $redisHealthy = Wait-ForHealthy -Name "Redis" -HealthCommand 'docker exec trading-redis redis-cli ping 2>$null'
    
    if (-not $mongoHealthy -or -not $redisHealthy) {
        Write-Err "Infrastructure failed to start"
        return
    }
    $infraTime = Stop-Timer "infra"
    Write-Success "Infrastructure ready! ($infraTime sec)"
    
    # ================================================
    Write-Step "PHASE 3: Install Dependencies (if needed)"
    
    # Check backend dependencies
    if (-not (Test-Path "backend-express/node_modules")) {
        Start-Timer "backend-deps"
        Write-Host "   Installing backend dependencies..." -ForegroundColor Yellow
        Push-Location "backend-express"
        npm install 2>&1 | Out-Null
        Pop-Location
        $backendDepsTime = Stop-Timer "backend-deps"
        Write-Success "Backend dependencies installed ($backendDepsTime sec)"
    }
    
    # Check frontend dependencies
    if (-not (Test-Path "frontend-nextjs/node_modules")) {
        Start-Timer "frontend-deps"
        Write-Host "   Installing frontend dependencies..." -ForegroundColor Yellow
        Push-Location "frontend-nextjs"
        npm install 2>&1 | Out-Null
        Pop-Location
        $frontendDepsTime = Stop-Timer "frontend-deps"
        Write-Success "Frontend dependencies installed ($frontendDepsTime sec)"
    }
    
    # Check Python dependencies
    Start-Timer "python-deps"
    Write-Host "   Checking Python dependencies..." -ForegroundColor Yellow
    Push-Location "data-engine"
    pip install -r requirements.txt -q 2>&1 | Out-Null
    Pop-Location
    $pythonDepsTime = Stop-Timer "python-deps"
    Write-Success "Python dependencies ready ($pythonDepsTime sec)"
    
    # ================================================
    Write-Step "PHASE 4: Start Backend"
    Start-Timer "backend"
    Write-Host "   Starting Express backend in new terminal..." -ForegroundColor Yellow
    
    Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location 'backend-express'; Write-Host 'Backend Express Server' -ForegroundColor Cyan; npm run dev"
    ) -WorkingDirectory $PSScriptRoot
    
    # Wait for backend to be ready
    Start-Sleep -Seconds 5
    Wait-ForHttpEndpoint -Name "Backend" -Url "http://localhost:4000/api/health" -TimeoutSeconds 60
    $backendTime = Stop-Timer "backend"
    
    # ================================================
    Write-Step "PHASE 5: Start Data Engine"
    Start-Timer "data-engine"
    Write-Host "   Starting Python Data Engine in new terminal..." -ForegroundColor Yellow
    
    Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location 'data-engine'; Write-Host 'Data Engine (Python)' -ForegroundColor Yellow; python market_simulator.py"
    ) -WorkingDirectory $PSScriptRoot
    
    Start-Sleep -Seconds 3
    $dataTime = Stop-Timer "data-engine"
    Write-Success "Data Engine started! ($dataTime sec)"
    
    # ================================================
    Write-Step "PHASE 6: Start Frontend (Last - Heaviest)"
    Start-Timer "frontend"
    Write-Host "   Starting Next.js frontend in new terminal..." -ForegroundColor Yellow
    
    Start-Process -FilePath "powershell" -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location 'frontend-nextjs'; Write-Host 'Frontend Next.js' -ForegroundColor Magenta; npm run dev"
    ) -WorkingDirectory $PSScriptRoot
    
    # Wait for frontend to compile
    Wait-ForHttpEndpoint -Name "Frontend" -Url "http://localhost:3000" -TimeoutSeconds 90
    $frontendTime = Stop-Timer "frontend"
    
    # ================================================
    Show-Summary
}

# ================================================
# Summary
# ================================================
function Show-Summary {
    $totalTime = [math]::Round(((Get-Date) - $global:TotalStartTime).TotalSeconds, 1)
    
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Green
    Write-Host "              All Services Started!                           " -ForegroundColor Green
    Write-Host "==============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Service Endpoints:" -ForegroundColor Cyan
    Write-Host "     Frontend:   http://localhost:3000" -ForegroundColor White
    Write-Host "     Backend:    http://localhost:4000" -ForegroundColor White
    Write-Host "     API Health: http://localhost:4000/api/health" -ForegroundColor White
    Write-Host "     MongoDB:    mongodb://localhost:27017" -ForegroundColor White
    Write-Host "     Redis:      redis://localhost:6379" -ForegroundColor White
    Write-Host ""
    Write-Host "  Total startup time: $totalTime seconds" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Useful Commands:" -ForegroundColor Cyan
    Write-Host "     View logs:  docker compose logs -f [service]" -ForegroundColor Gray
    Write-Host "     Stop all:   docker compose down" -ForegroundColor Gray
    Write-Host "     Status:     docker compose ps" -ForegroundColor Gray
    Write-Host ""
    Write-Host "==============================================================" -ForegroundColor Green
    Write-Host ""
}

# ================================================
# MAIN
# ================================================
Show-Banner

Write-Host "Mode: $Mode" -ForegroundColor Gray
Write-Host "Skip Build: $SkipBuild" -ForegroundColor Gray
Write-Host ""

switch ($Mode.ToLower()) {
    "docker" { Start-DockerSequential }
    "local" { Start-LocalSequential }
    "hybrid" { 
        Write-Warn "Hybrid mode: Docker for DB, Local for apps"
        Start-LocalSequential 
    }
    default {
        Write-Host "Usage: .\start-optimized.ps1 [Mode] [-SkipBuild] [-Verbose]" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Modes:" -ForegroundColor Cyan
        Write-Host "  docker  - Run everything in Docker containers (default)" -ForegroundColor White
        Write-Host "  local   - Run apps locally, only DB in Docker" -ForegroundColor White
        Write-Host "  hybrid  - Same as local (DB in Docker, apps local)" -ForegroundColor White
        Write-Host ""
        Write-Host "Options:" -ForegroundColor Cyan
        Write-Host "  -SkipBuild      Skip rebuilding Docker images" -ForegroundColor White
        Write-Host "  -HealthTimeout  Max seconds to wait for health (default: 60)" -ForegroundColor White
    }
}
