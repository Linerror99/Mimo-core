"""
Tests for authentication service (TDD - Red Phase)

User Stories tested:
- US-1.1: Create individual account
- US-6.1: Logout
- US-6.2: Update user info
- US-6.2b: Change password
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.auth_service import AuthService
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin


@pytest.mark.asyncio
class TestAuthService:
    """Test authentication service business logic."""
    
    async def test_register_user_creates_user_and_household(self, db_session: AsyncSession):
        """US-1.1: User can register with email, password, first_name, last_name."""
        # Arrange
        auth_service = AuthService(db_session)
        user_data = UserCreate(
            email="test@example.com",
            password="SecurePass123!",
            first_name="John",
            last_name="Doe"
        )
        
        # Act
        user = await auth_service.register(user_data)
        
        # Assert
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.first_name == "John"
        assert user.last_name == "Doe"
        assert user.password_hash != "SecurePass123!"  # Password should be hashed
        assert user.household_id is not None  # Should create INDIVIDUAL household
    
    async def test_register_duplicate_email_raises_error(self, db_session: AsyncSession):
        """Registering with existing email should fail."""
        # Arrange
        auth_service = AuthService(db_session)
        user_data = UserCreate(
            email="duplicate@example.com",
            password="Pass123!",
            first_name="John",
            last_name="Doe"
        )
        
        # Act - Create first user
        await auth_service.register(user_data)
        
        # Assert - Second registration should raise error
        with pytest.raises(ValueError, match="Email already registered"):
            await auth_service.register(user_data)
    
    async def test_login_with_valid_credentials_returns_tokens(self, db_session: AsyncSession):
        """User can login with correct credentials and receive JWT tokens."""
        # Arrange
        auth_service = AuthService(db_session)
        user_data = UserCreate(
            email="login@example.com",
            password="Pass123!",
            first_name="Jane",
            last_name="Doe"
        )
        await auth_service.register(user_data)
        
        # Act
        login_data = UserLogin(email="login@example.com", password="Pass123!")
        tokens = await auth_service.login(login_data)
        
        # Assert
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert tokens["token_type"] == "bearer"
    
    async def test_login_with_invalid_password_raises_error(self, db_session: AsyncSession):
        """Login with wrong password should fail."""
        # Arrange
        auth_service = AuthService(db_session)
        user_data = UserCreate(
            email="test@example.com",
            password="CorrectPass123!",
            first_name="John",
            last_name="Doe"
        )
        await auth_service.register(user_data)
        
        # Act & Assert
        login_data = UserLogin(email="test@example.com", password="WrongPass123!")
        with pytest.raises(ValueError, match="Invalid credentials"):
            await auth_service.login(login_data)
    
    async def test_login_with_nonexistent_email_raises_error(self, db_session: AsyncSession):
        """Login with non-existent email should fail."""
        # Arrange
        auth_service = AuthService(db_session)
        
        # Act & Assert
        login_data = UserLogin(email="nonexistent@example.com", password="Pass123!")
        with pytest.raises(ValueError, match="Invalid credentials"):
            await auth_service.login(login_data)
    
    async def test_verify_password_returns_true_for_correct_password(self):
        """Password verification should work correctly."""
        # Arrange
        auth_service = AuthService(None)  # No DB needed for password check
        plain_password = "MySecurePass123!"
        hashed = auth_service.hash_password(plain_password)
        
        # Act & Assert
        assert auth_service.verify_password(plain_password, hashed) is True
        assert auth_service.verify_password("WrongPassword", hashed) is False
