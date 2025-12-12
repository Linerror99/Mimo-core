"""Global error handling and exception mapping for production."""

import json
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.logger import logger


class DuoFlowException(Exception):
    """Base exception for DuoFlow application."""

    def __init__(
        self,
        message: str,
        user_message: Optional[str] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.message = message
        self.user_message = user_message or "Une erreur s'est produite"
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ResourceNotFoundError(DuoFlowException):
    """Exception for resource not found (404)."""

    def __init__(self, resource: str, resource_id: Optional[str] = None):
        message = f"{resource} not found"
        if resource_id:
            message += f": {resource_id}"

        user_message = f"{resource} introuvable"

        super().__init__(
            message=message,
            user_message=user_message,
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "resource_id": resource_id},
        )


class PermissionDeniedError(DuoFlowException):
    """Exception for permission denied (403)."""

    def __init__(self, action: str, resource: Optional[str] = None):
        message = f"Permission denied for action: {action}"
        if resource:
            message += f" on {resource}"

        user_message = "Vous n'avez pas accès à cette ressource"

        super().__init__(
            message=message,
            user_message=user_message,
            status_code=status.HTTP_403_FORBIDDEN,
            details={"action": action, "resource": resource},
        )


class BusinessLogicError(DuoFlowException):
    """Exception for business logic violations (400)."""

    def __init__(self, message: str, user_message: Optional[str] = None):
        super().__init__(
            message=message,
            user_message=user_message or "Les données saisies sont invalides",
            status_code=status.HTTP_400_BAD_REQUEST,
        )


class AuthenticationError(DuoFlowException):
    """Exception for authentication failures (401)."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            user_message="Identifiants incorrects",
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


def map_exception_to_user_message(exc: Exception) -> str:
    """
    Map exception to user-friendly message.

    Args:
        exc: Exception to map

    Returns:
        User-friendly error message in French
    """
    # Custom exceptions
    if isinstance(exc, DuoFlowException):
        return exc.user_message

    # HTTP exceptions
    if isinstance(exc, HTTPException):
        status_code = exc.status_code
        if status_code == 400:
            return "Les données saisies sont invalides"
        elif status_code == 401:
            return "Vous devez être connecté pour accéder à cette ressource"
        elif status_code == 403:
            return "Vous n'avez pas accès à cette ressource"
        elif status_code == 404:
            return "Ressource introuvable"
        elif status_code == 409:
            return "Cette ressource existe déjà"
        elif status_code == 422:
            return "Les données saisies sont invalides"
        elif status_code >= 500:
            return "Une erreur interne s'est produite"
        return "Une erreur s'est produite"

    # Validation errors
    if isinstance(exc, (ValidationError, RequestValidationError)):
        return "Les données saisies ne sont pas valides"

    # Database errors
    if isinstance(exc, IntegrityError):
        if "unique" in str(exc).lower():
            return "Cette ressource existe déjà"
        elif "foreign key" in str(exc).lower():
            return "Référence invalide vers une autre ressource"
        return "Erreur d'intégrité des données"

    if isinstance(exc, SQLAlchemyError):
        return "Erreur lors de l'accès à la base de données"

    # Default
    return "Une erreur s'est produite"


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for all unhandled exceptions.

    Args:
        request: FastAPI request
        exc: Exception raised

    Returns:
        JSON response with error details
    """
    # Extract request info
    method = request.method
    endpoint = request.url.path

    # Default values
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    user_message = "Une erreur interne s'est produite"
    error_type = exc.__class__.__name__

    # Custom exceptions
    if isinstance(exc, DuoFlowException):
        status_code = exc.status_code
        user_message = exc.user_message
        internal_message = exc.message
        details = exc.details

    # HTTP exceptions
    elif isinstance(exc, HTTPException):
        status_code = exc.status_code
        user_message = map_exception_to_user_message(exc)
        internal_message = str(exc.detail)
        details = {}

    # Validation errors
    elif isinstance(exc, RequestValidationError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        user_message = "Les données saisies ne sont pas valides"
        internal_message = "Validation error"
        # Convert Decimal to float for JSON serialization
        errors = exc.errors()
        details = {"errors": json.loads(json.dumps(errors, default=str))}

    # Database errors
    elif isinstance(exc, IntegrityError):
        status_code = status.HTTP_409_CONFLICT
        user_message = map_exception_to_user_message(exc)
        internal_message = "Database integrity error"
        details = {}

    # Other exceptions
    else:
        internal_message = str(exc)
        details = {}

    # Log error with context (but NOT sensitive data)
    logger.error(
        f"Exception in {method} {endpoint}: {error_type} - {internal_message}",
        extra={
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "error_type": error_type,
            # Do NOT log user_id from JWT (would require parsing)
        },
        exc_info=status_code >= 500,  # Only log stack trace for 5xx errors
    )

    # Prepare response
    response_data = {
        "error": user_message,
        "status_code": status_code,
    }

    # Add details for validation errors (but only in development)
    if status_code == 422 and details:
        response_data["details"] = details

    return JSONResponse(
        status_code=status_code,
        content=response_data,
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Handler for HTTPException (overrides FastAPI default).

    Args:
        request: FastAPI request
        exc: HTTPException raised

    Returns:
        JSON response with user-friendly error
    """
    return await global_exception_handler(request, exc)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    Handler for RequestValidationError (422).

    Args:
        request: FastAPI request
        exc: Validation exception

    Returns:
        JSON response with validation errors
    """
    return await global_exception_handler(request, exc)
