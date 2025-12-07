"""FastAPI Application Entry Point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import health, auth, users, accounts, categories, transactions, recurring_templates, projections, notifications, jobs

app = FastAPI(
    title="DuoFlow Finance API",
    description="API for personal and couple finance management",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration - Permissive for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=False,  # Must be False when allow_origins is ["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(users.router, prefix=settings.API_V1_PREFIX, tags=["Users"])
app.include_router(accounts.router, prefix=settings.API_V1_PREFIX, tags=["Accounts"])
app.include_router(categories.router, prefix=settings.API_V1_PREFIX, tags=["Categories"])
app.include_router(transactions.router, prefix=settings.API_V1_PREFIX, tags=["Transactions"])
app.include_router(recurring_templates.router, tags=["Recurring Templates"])
app.include_router(projections.router, tags=["Projections"])
app.include_router(notifications.router, tags=["Notifications"])
app.include_router(jobs.router, tags=["Jobs"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to DuoFlow Finance API",
        "version": "0.1.0",
        "docs": "/docs",
    }
