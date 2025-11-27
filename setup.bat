@echo off
echo ========================================================
echo 🚀 Setting up DuoFlow Finance - Development Environment
echo ========================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

echo ✅ Docker is running
echo.

echo 📝 Setting up environment files...

if not exist .env (
    copy .env.example .env >nul
    echo ✅ Created .env from .env.example
) else (
    echo ⚠️  .env already exists, skipping
)

if not exist backend\.env (
    copy backend\.env.example backend\.env >nul
    echo ✅ Created backend\.env
) else (
    echo ⚠️  backend\.env already exists, skipping
)

if not exist frontend\.env (
    copy frontend\.env.example frontend\.env >nul
    echo ✅ Created frontend\.env
) else (
    echo ⚠️  frontend\.env already exists, skipping
)

echo.
echo 🐳 Starting Docker containers...
docker-compose up -d

echo.
echo ⏳ Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

echo 🔍 Checking backend health...
:wait_loop
set /a retry_count+=1
if %retry_count% gtr 30 goto :failed

curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo ⏳ Waiting for backend... (%retry_count%/30)
    timeout /t 2 /nobreak >nul
    goto :wait_loop
)

echo ✅ Backend is healthy!
echo.

echo 🔍 Checking detailed health (Database + Redis)...
curl -s http://localhost:8000/health/detailed

echo.
echo ✅ Setup complete!
echo.
echo 📋 Available services:
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:8000
echo    API Docs:  http://localhost:8000/docs
echo    ReDoc:     http://localhost:8000/redoc
echo.
echo 📝 Useful commands:
echo    Stop:      docker-compose down
echo    Logs:      docker-compose logs -f
echo    Restart:   docker-compose restart
echo    Rebuild:   docker-compose up -d --build
echo.
goto :end

:failed
echo ❌ Backend failed to start
echo Run 'docker-compose logs backend' to see the logs
exit /b 1

:end
