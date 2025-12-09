"""FastAPI Application Entry Point"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import settings
from app.api import health, auth, users, accounts, categories, transactions, recurring_templates, projections, notifications, jobs, invitations, wallets, households
from app.api.v1 import goals, exports

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

# Mount static files for uploads (avatars, receipts, etc.)
UPLOAD_DIR = Path("/app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Authentication"])
app.include_router(users.router, prefix=settings.API_V1_PREFIX, tags=["Users"])
app.include_router(accounts.router, prefix=settings.API_V1_PREFIX, tags=["Accounts"])
app.include_router(categories.router, prefix=settings.API_V1_PREFIX, tags=["Categories"])
app.include_router(transactions.router, prefix=settings.API_V1_PREFIX, tags=["Transactions"])
app.include_router(goals.router, prefix=settings.API_V1_PREFIX, tags=["Goals"])
app.include_router(exports.router, prefix=settings.API_V1_PREFIX, tags=["Exports"])
app.include_router(invitations.router, prefix=settings.API_V1_PREFIX, tags=["Invitations"])
app.include_router(households.router, prefix=settings.API_V1_PREFIX, tags=["Households"])
app.include_router(wallets.router, prefix=f"{settings.API_V1_PREFIX}/wallets", tags=["Wallets"])
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
