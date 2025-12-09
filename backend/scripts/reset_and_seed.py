"""
Script de Reset & Seed Database pour DuoFlow Finance

Ce script:
1. DROP toutes les tables
2. Recrée le schema complet via Alembic
3. Peuple la DB avec 2 utilisateurs de test + données

Usage:
    docker compose exec backend python scripts/reset_and_seed.py
    
Utilisateurs créés:
    User 1: moi.toi@test.com / password123
    User 2: il.elle@test.com / password123
"""
import asyncio
import sys
from pathlib import Path

# Ajouter le parent directory au path pour imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, date, timedelta
from decimal import Decimal

from sqlalchemy import text
from app.database import engine, AsyncSessionLocal
from app.models import (
    User,
    Household,
    HouseholdType,
    HouseholdStatus,
    Account,
    AccountType,
    Category,
    CategoryType,
    Transaction,
    TransactionType,
    TransactionState,
    TransactionOwnerType,
    RecurrenceFrequency,
    Goal,
)
from app.services.auth import AuthService


async def reset_database():
    """Drop toutes les tables et recrée le schema."""
    print("🗑️  Dropping all tables...")
    
    async with engine.begin() as conn:
        # Drop all tables (CASCADE pour supprimer les FK)
        await conn.execute(text("DROP SCHEMA public CASCADE"))
        await conn.execute(text("CREATE SCHEMA public"))
        await conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
    
    print("✅ Database reset complete")
    print("🔧 Running Alembic migrations...")
    
    # Exécuter les migrations Alembic
    import subprocess
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd=Path(__file__).parent.parent,
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ Alembic migration failed:\n{result.stderr}")
        sys.exit(1)
    
    print("✅ Alembic migrations applied")


async def seed_database():
    """Peuple la base avec 2 utilisateurs de test."""
    print("\n🌱 Seeding database with test data...")
    
    async with AsyncSessionLocal() as db:
        try:
            # ============================================================
            # USER 1: Moi Toi (INDIVIDUAL household)
            # ============================================================
            print("\n👤 Creating User 1: Moi Toi")
            
            # Create INDIVIDUAL household for user
            household1 = Household(
                id="household-moi-toi",
                name="Moi Toi",
                type=HouseholdType.INDIVIDUAL,
                status=HouseholdStatus.ACTIVE,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(household1)
            
            user1 = User(
                id="user-moi-toi",
                household_id=household1.id,  # User is linked to household
                email="moi.toi@test.com",
                password_hash=AuthService.hash_password("password123"),
                first_name="Moi",
                last_name="Toi",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user1)
            
            # Account
            account1 = Account(
                id="account-moi-toi-1",
                household_id=household1.id,
                name="Compte Courant N26",
                type=AccountType.CHECKING,
                initial_balance=Decimal("1000.00"),
                original_owner_user_id=user1.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(account1)
            
            # Categories
            categories1 = [
                Category(
                    id="cat-salaire-1",
                    household_id=household1.id,
                    name="Salaire",
                    type=CategoryType.INCOME,
                    color="#10B981",
                    icon="money",
                ),
                Category(
                    id="cat-courses-1",
                    household_id=household1.id,
                    name="Courses",
                    type=CategoryType.EXPENSE,
                    color="#3B82F6",
                    icon="shopping-cart",
                ),
                Category(
                    id="cat-transport-1",
                    household_id=household1.id,
                    name="Transport",
                    type=CategoryType.EXPENSE,
                    color="#F97316",
                    icon="car",
                ),
            ]
            for cat in categories1:
                db.add(cat)
            
            # Transactions
            today = date.today()
            transactions1 = [
                Transaction(
                    id="tx-moi-1",
                    household_id=household1.id,
                    account_id=account1.id,
                    type=TransactionType.INCOME,
                    amount=Decimal("2500.00"),
                    transaction_date=today - timedelta(days=5),
                    state=TransactionState.REALIZED,
                    description="Salaire Novembre",
                    category_id="cat-salaire-1",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user1.id,
                ),
                Transaction(
                    id="tx-moi-2",
                    household_id=household1.id,
                    account_id=account1.id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal("-150.50"),
                    transaction_date=today - timedelta(days=3),
                    state=TransactionState.REALIZED,
                    description="Monoprix",
                    category_id="cat-courses-1",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user1.id,
                ),
                Transaction(
                    id="tx-moi-3",
                    household_id=household1.id,
                    account_id=account1.id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal("-55.00"),
                    transaction_date=today - timedelta(days=1),
                    state=TransactionState.REALIZED,
                    description="Station Total",
                    category_id="cat-transport-1",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user1.id,
                ),
                Transaction(
                    id="tx-moi-4",
                    household_id=household1.id,
                    account_id=account1.id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal("-45.00"),
                    transaction_date=today,
                    state=TransactionState.PROJECTED,
                    description="Restaurant",
                    category_id="cat-courses-1",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user1.id,
                ),
                Transaction(
                    id="tx-moi-5",
                    household_id=household1.id,
                    account_id=account1.id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal("-15.99"),
                    transaction_date=today + timedelta(days=5),
                    state=TransactionState.PROJECTED,
                    description="Netflix Abonnement",
                    category_id="cat-courses-1",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user1.id,
                ),
            ]
            for tx in transactions1:
                db.add(tx)
            
            # Goals (personal only, no household_id on goal)
            goals1 = [
                Goal(
                    id="goal-vacances-bali",
                    user_id=user1.id,
                    household_id=None,
                    created_by=user1.id,
                    name="Vacances à Bali",
                    description="Voyage de rêve à Bali pour 2 semaines",
                    target_amount=Decimal("3000.00"),
                    current_amount=Decimal("800.00"),
                    target_date=date.today() + timedelta(days=180),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
                Goal(
                    id="goal-macbook",
                    user_id=user1.id,
                    household_id=None,
                    created_by=user1.id,
                    name="MacBook Pro",
                    description="Nouveau laptop pour le travail",
                    target_amount=Decimal("2500.00"),
                    current_amount=Decimal("1200.00"),
                    target_date=date.today() + timedelta(days=90),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
            ]
            for goal in goals1:
                db.add(goal)
            
            print(f"   ✅ Created user: {user1.email} with INDIVIDUAL household")
            print(f"   ✅ Created account: {account1.name} ({account1.initial_balance}€)")
            print(f"   ✅ Created {len(categories1)} categories")
            print(f"   ✅ Created {len(transactions1)} transactions")
            print(f"   ✅ Created {len(goals1)} personal goals")
            
            # ============================================================
            # USER 2: Il Elle (INDIVIDUAL household)
            # ============================================================
            print("\n👤 Creating User 2: Il Elle")
            
            # Create INDIVIDUAL household for user
            household2 = Household(
                id="household-il-elle",
                name="Il Elle",
                type=HouseholdType.INDIVIDUAL,
                status=HouseholdStatus.ACTIVE,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(household2)
            
            user2 = User(
                id="user-il-elle",
                household_id=household2.id,  # User is linked to household
                email="il.elle@test.com",
                password_hash=AuthService.hash_password("password123"),
                first_name="Il",
                last_name="Elle",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user2)
            
            # Account
            account2 = Account(
                id="account-il-elle-1",
                household_id=household2.id,
                name="Compte Épargne",
                type=AccountType.SAVINGS,
                initial_balance=Decimal("500.00"),
                original_owner_user_id=user2.id,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(account2)
            
            # Categories
            categories2 = [
                Category(
                    id="cat-salaire-2",
                    household_id=household2.id,
                    name="Salaire",
                    type=CategoryType.INCOME,
                    color="#10B981",
                    icon="money",
                ),
                Category(
                    id="cat-shopping-2",
                    household_id=household2.id,
                    name="Shopping",
                    type=CategoryType.EXPENSE,
                    color="#EC4899",
                    icon="shopping-bag",
                ),
            ]
            for cat in categories2:
                db.add(cat)
            
            # Transactions
            transactions2 = [
                Transaction(
                    id="tx-il-1",
                    household_id=household2.id,
                    account_id=account2.id,
                    type=TransactionType.INCOME,
                    amount=Decimal("1800.00"),
                    transaction_date=today - timedelta(days=7),
                    state=TransactionState.REALIZED,
                    description="Salaire Novembre",
                    category_id="cat-salaire-2",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user2.id,
                ),
                Transaction(
                    id="tx-il-2",
                    household_id=household2.id,
                    account_id=account2.id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal("-120.00"),
                    transaction_date=today - timedelta(days=2),
                    state=TransactionState.REALIZED,
                    description="Zara",
                    category_id="cat-shopping-2",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user2.id,
                ),
                Transaction(
                    id="tx-il-3",
                    household_id=household2.id,
                    account_id=account2.id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal("-9.99"),
                    transaction_date=today + timedelta(days=3),
                    state=TransactionState.PROJECTED,
                    description="Spotify Premium",
                    category_id="cat-shopping-2",
                    recurrence_frequency=RecurrenceFrequency.NONE,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user2.id,
                ),
            ]
            for tx in transactions2:
                db.add(tx)
            
            # Goals
            goals2 = [
                Goal(
                    id="goal-iphone",
                    user_id=user2.id,
                    household_id=None,
                    created_by=user2.id,
                    name="iPhone 16 Pro",
                    description="Nouveau téléphone",
                    target_amount=Decimal("1200.00"),
                    current_amount=Decimal("300.00"),
                    target_date=date.today() + timedelta(days=120),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
                Goal(
                    id="goal-fonds-urgence",
                    user_id=user2.id,
                    household_id=None,
                    created_by=user2.id,
                    name="Fonds d'urgence",
                    description="3 mois de salaire en épargne de sécurité",
                    target_amount=Decimal("5400.00"),
                    current_amount=Decimal("900.00"),
                    target_date=date.today() + timedelta(days=365),
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                ),
            ]
            for goal in goals2:
                db.add(goal)
            
            print(f"   ✅ Created user: {user2.email} with INDIVIDUAL household")
            print(f"   ✅ Created account: {account2.name} ({account2.initial_balance}€)")
            print(f"   ✅ Created {len(categories2)} categories")
            print(f"   ✅ Created {len(transactions2)} transactions")
            print(f"   ✅ Created {len(goals2)} personal goals")
            
            # Commit all
            await db.commit()
            
            print("\n" + "="*60)
            print("✅ DATABASE SEEDED SUCCESSFULLY!")
            print("="*60)
            print("\n📧 Test Credentials:")
            print("\n   User 1:")
            print("   Email:    moi.toi@test.com")
            print("   Password: password123")
            print("   Status:   INDIVIDUAL household (1 member)")
            print("   Balance:  1000€ initial + transactions = ~3233.51€")
            print("\n   User 2:")
            print("   Email:    il.elle@test.com")
            print("   Password: password123")
            print("   Status:   INDIVIDUAL household (1 member)")
            print("   Balance:  500€ initial + transactions = ~2170.01€")
            print("\n💡 Tips:")
            print("   - Both users have INDIVIDUAL households (1 member each)")
            print("   - They can only create PERSONAL goals (household option disabled)")
            print("   - Household goals require 2+ members in household")
            print("   - To test COUPLE features:")
            print("     1. Login as User 1")
            print("     2. Go to Settings → Invitations")
            print("     3. Invite il.elle@test.com")
            print("     4. Login as User 2 and accept")
            print("     5. Both users will merge into COUPLE household")
            print("     6. Then household goals option will be enabled!")
            print("\n" + "="*60)
            
        except Exception as e:
            print(f"\n❌ Error seeding database: {e}")
            await db.rollback()
            raise


async def main():
    """Main entry point."""
    print("="*60)
    print("🚀 DUOFLOW FINANCE - DATABASE RESET & SEED")
    print("="*60)
    print("\n⚠️  WARNING: This will DELETE ALL DATA in the database!")
    print("   Press Ctrl+C within 3 seconds to cancel...\n")
    
    try:
        await asyncio.sleep(3)
    except KeyboardInterrupt:
        print("\n❌ Aborted by user")
        sys.exit(0)
    
    try:
        await reset_database()
        await seed_database()
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("\n🎉 All done! Database is ready for testing.")


if __name__ == "__main__":
    asyncio.run(main())
