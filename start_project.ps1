Write-Host "🚀 Starting Paper Trading Platform..." -ForegroundColor Green

# 1. Start Redis (Assuming it's installed and running as a service or we can't easily start it here without path. 
# We'll assume user has Redis running or start a docker container if they had one, but strict instructions said use local tools)
# For now, we'll check if redis is reachable later or just proceed.

# 2. Start Backend
Write-Host "📦 Starting Backend (Express)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd backend-express; npm run dev" -WorkingDirectory $PSScriptRoot

# 3. Start Data Engine
Write-Host "📊 Starting Data Engine (Python)..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd data-engine; python market_simulator.py" -WorkingDirectory $PSScriptRoot

# 4. Start Frontend
Write-Host "🎨 Starting Frontend (Next.js)..." -ForegroundColor Magenta
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd frontend-nextjs; npm run dev" -WorkingDirectory $PSScriptRoot

Write-Host "✅ All services started! Access the app at http://localhost:3000" -ForegroundColor Green
