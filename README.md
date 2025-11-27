# 🚀 DuoFlow Finance

> Modern personal and couple finance management application

## 📋 Overview

DuoFlow Finance is a comprehensive finance management tool that helps individuals and couples track their finances with a unified timeline (past → present → future).

**Stack:**
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + Python 3.12 + SQLAlchemy (async)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Infrastructure**: Docker Compose

---

## ⚡ Quick Start

### Prerequisites
- Docker Desktop
- Git

### Setup (One command)

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This will start all services and verify health checks.

---

## 🌐 Access URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5000 |
| **Backend API** | http://localhost:8000 |
| **API Docs** | http://localhost:8000/docs |
| **Health Check** | http://localhost:8000/health |

---

## 📁 Project Structure

```
Mimo-core/
├── backend/           # FastAPI Backend
├── frontend/          # React Frontend  
├── docs/              # Documentation & Specs
└── docker-compose.yml # Orchestration
```

---

## 🔧 Development Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## 📚 Documentation

- **[Specifications](docs/SPECIFICATIONS.md)** - Complete feature specs
- **[Sprint Planning](docs/SPRINT-PLANNING.md)** - Development roadmap
- **[Tech Stack](docs/STACK-TECHNIQUE.md)** - Architecture details

---

## 🎯 Current Status

**Sprint 0** ✅ Complete
- Infrastructure setup
- Docker orchestration
- Health checks

**Sprint 1** 🚧 In Progress
- Authentication (JWT)
- User management
- Profile settings

---

## 📄 License

MIT License

---

**Happy Coding! 🚀**