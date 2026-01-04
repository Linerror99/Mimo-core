#!/bin/bash

echo "🚀 Setting up DuoFlow Finance - Development Environment"
echo "========================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Create .env files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env from .env.example${NC}"
else
    echo -e "${YELLOW}⚠️  .env already exists, skipping${NC}"
fi

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✅ Created backend/.env${NC}"
else
    echo -e "${YELLOW}⚠️  backend/.env already exists, skipping${NC}"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✅ Created frontend/.env${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/.env already exists, skipping${NC}"
fi

echo ""
echo "🐳 Starting Docker containers..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check backend health
echo "🔍 Checking backend health..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "⏳ Waiting for backend... ($retry_count/$max_retries)"
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    echo "Run 'docker-compose logs backend' to see the logs"
    exit 1
fi

# Check detailed health
echo ""
echo "🔍 Checking detailed health (Database + Redis)..."
curl -s http://localhost:8000/health/detailed | python3 -m json.tool

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Available services:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:8000"
echo "   API Docs:  http://localhost:8000/docs"
echo "   ReDoc:     http://localhost:8000/redoc"
echo ""
echo "📝 Useful commands:"
echo "   Stop:      docker-compose down"
echo "   Logs:      docker-compose logs -f"
echo "   Restart:   docker-compose restart"
echo "   Rebuild:   docker-compose up -d --build"
echo ""
