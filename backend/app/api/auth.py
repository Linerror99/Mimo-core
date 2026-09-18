"""
Authentication API endpoints
"""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

from app.api.deps import CurrentUser
from app.database import get_db
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenRefresh,
    UserCreate,
    UserLogin,
    UserResponse,
    VerifyResetCodeRequest,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Register a new user with INDIVIDUAL household (solo).

    The household becomes COUPLE when another user accepts an invitation.

    - **email**: Valid email address (unique)
    - **password**: Min 8 chars with uppercase, lowercase, number
    - **first_name**: User first name
    - **last_name**: User last name
    """
    auth_service = AuthService(db)

    try:
        user = await auth_service.register(user_data)
        return user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login")
async def login(
    login_data: UserLogin,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Authenticate user and return JWT tokens.
    Sets refresh_token in a secure HttpOnly cookie.

    - **email**: User email
    - **password**: User password

    Returns access_token and refresh_token.
    """
    auth_service = AuthService(db)

    try:
        tokens = await auth_service.login(login_data)

        # Set secure HttpOnly cookie for refresh token (7 days)
        # Note: SameSite="none" and Secure=True is required for cross-origin SPA <-> API on Cloud Run
        samesite = settings.COOKIE_SAMESITE if hasattr(settings, "COOKIE_SAMESITE") else "none"
        secure = settings.COOKIE_SECURE if hasattr(settings, "COOKIE_SECURE") else True
        max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600

        response.set_cookie(
            key="refresh_token",
            value=tokens["refresh_token"],
            max_age=max_age,
            expires=max_age,
            httponly=True,
            secure=secure,
            samesite=samesite,
            path="/api/v1/auth",
            domain=settings.COOKIE_DOMAIN if hasattr(settings, "COOKIE_DOMAIN") else None,
        )

        return tokens
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Logout current user by blacklisting their access token and clearing refresh cookie.

    Requires: Bearer token in Authorization header
    """
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        auth_service = AuthService(db)
        try:
            await auth_service.logout(token)
        except Exception:
            pass

    # Clear refresh token cookie
    samesite = settings.COOKIE_SAMESITE if hasattr(settings, "COOKIE_SAMESITE") else "none"
    secure = settings.COOKIE_SECURE if hasattr(settings, "COOKIE_SECURE") else True
    response.delete_cookie(
        key="refresh_token",
        path="/api/v1/auth",
        domain=settings.COOKIE_DOMAIN if hasattr(settings, "COOKIE_DOMAIN") else None,
        secure=secure,
        httponly=True,
        samesite=samesite,
    )

    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_data: Optional[TokenRefresh] = None,
):
    """
    Refresh access token using refresh token from HttpOnly cookie or request body.

    Returns new access_token.
    """
    # 1. Try to read from HttpOnly cookie
    token_to_use = request.cookies.get("refresh_token")

    # 2. Fallback to request body if not in cookie (backward compatibility)
    if not token_to_use and refresh_data and refresh_data.refresh_token:
        token_to_use = refresh_data.refresh_token

    if not token_to_use:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token manquant"
        )

    auth_service = AuthService(db)

    try:
        new_access_token = await auth_service.refresh_access_token(token_to_use)
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except ValueError as e:
        # Clear invalid cookie on failure
        samesite = settings.COOKIE_SAMESITE if hasattr(settings, "COOKIE_SAMESITE") else "none"
        secure = settings.COOKIE_SECURE if hasattr(settings, "COOKIE_SECURE") else True
        response.delete_cookie(
            key="refresh_token",
            path="/api/v1/auth",
            domain=settings.COOKIE_DOMAIN if hasattr(settings, "COOKIE_DOMAIN") else None,
            secure=secure,
            httponly=True,
            samesite=samesite,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/forgot-password")
async def forgot_password(
    request_data: ForgotPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Request password reset 6-digit OTP code by email.
    """
    auth_service = AuthService(db)
    result = await auth_service.forgot_password(request_data.email)
    return result


@router.post("/verify-reset-code")
async def verify_reset_code(
    request_data: VerifyResetCodeRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Verify if the 6-digit email code is valid before prompting for new password.
    """
    auth_service = AuthService(db)
    try:
        await auth_service.verify_reset_code(
            email=request_data.email,
            code=request_data.code
        )
        return {"valid": True, "message": "Code valide !"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/reset-password")
async def reset_password(
    request_data: ResetPasswordRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Reset password using 6-digit verification code sent by email.
    """
    auth_service = AuthService(db)
    try:
        await auth_service.reset_password(
            email=request_data.email,
            code=request_data.code,
            new_password=request_data.new_password
        )
        return {"message": "Mot de passe réinitialisé avec succès !"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


