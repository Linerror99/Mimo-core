"""
Authentication API endpoints
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

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
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Authenticate user and return JWT tokens.

    - **email**: User email
    - **password**: User password

    Returns access_token (15min) and refresh_token (7 days).
    """
    auth_service = AuthService(db)

    try:
        tokens = await auth_service.login(login_data)
        return tokens
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Logout current user by blacklisting their access token.

    Requires: Bearer token in Authorization header
    """
    # Extract token from Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        auth_service = AuthService(db)
        await auth_service.logout(token)

    return {"message": "Successfully logged out"}


@router.post("/refresh")
async def refresh_token(
    refresh_data: TokenRefresh,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token

    Returns new access_token.
    """
    auth_service = AuthService(db)

    try:
        new_access_token = await auth_service.refresh_access_token(refresh_data.refresh_token)
        return {
            "access_token": new_access_token,
            "token_type": "bearer"
        }
    except ValueError as e:
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


