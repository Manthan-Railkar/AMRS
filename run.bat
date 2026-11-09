@echo off
title AMRS Launch System
echo =======================================================
echo    AMRS - Adaptive Model Recovery System
echo =======================================================
echo.
echo [1/2] Starting Python FastAPI Backend on port 8000...
start "AMRS Backend (Port 8000)" cmd /k "python -m uvicorn amrs.api.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Next.js Web Frontend on port 3000...
start "AMRS Frontend (Port 3000)" cmd /k "npm run dev"

echo.
echo =======================================================
echo   AMRS is now running!
echo   - Web Dashboard: http://localhost:3000
echo   - Backend API:   http://localhost:8000
echo   - API Swagger:   http://localhost:8000/docs
echo =======================================================
echo.
echo (Press any key to close this launcher window...)
pause >nul
