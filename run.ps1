# AMRS Launcher for Windows PowerShell
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "   AMRS - Adaptive Model Recovery System" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/2] Starting Python FastAPI Backend on port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "[2/2] Starting Next.js Web Frontend on port 3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"

Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  AMRS is now running!" -ForegroundColor Yellow
Write-Host "  - Web Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  - Backend API:   http://localhost:8000" -ForegroundColor White
Write-Host "  - API Swagger:   http://localhost:8000/docs" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan

