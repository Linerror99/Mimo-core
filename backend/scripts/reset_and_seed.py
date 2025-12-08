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
            # USER 1: Moi Toi
            # ============================================================
            print("\n👤 Creating User 1: Moi Toi")
            
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
                household_id=household1.id,
                email="moi.toi@test.com",
                password_hash=AuthService.hash_password("password123"),
                first_name="Moi",
                last_name="Toi",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user1)
            
            # Compte bancaire User 1
            account1 = Account(
                id="account-moi-toi-1",
                household_id=household1.id,
                name="Compte Courant N26",
                type=AccountType.CHECKING,
                initial_balance=Decimal("1000.00"),
                original_owner_user_id=user1.id,  # NOUVEAU: Track du propriétaire
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(account1)
            
            # Catégories User 1
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
            
            # Transactions User 1 (5 transactions)
            today = date.today()
            
            transactions1 = [
                # Salaire (passé)
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
                # Courses (passé)
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
                # Essence (passé)
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
                # Restaurant (aujourd'hui - projeté)
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
                # Netflix (futur)
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
            
            print(f"   ✅ Created household: {household1.name}")
            print(f"   ✅ Created user: {user1.email}")
            print(f"   ✅ Created account: {account1.name} ({account1.initial_balance}€)")
            print(f"   ✅ Created {len(categories1)} categories")
            print(f"   ✅ Created {len(transactions1)} transactions")
            
            # ============================================================
            # USER 2: Il Elle
            # ============================================================
            print("\n👤 Creating User 2: Il Elle")
            
            household2 = Household(
                id="household-il-elle",
                name="Il Elle Nous Vous",
                type=HouseholdType.INDIVIDUAL,
                status=HouseholdStatus.ACTIVE,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(household2)
            
            user2 = User(
                id="user-il-elle",
                household_id=household2.id,
                email="il.elle@test.com",
                password_hash=AuthService.hash_password("password123"),
                first_name="Il",
                last_name="elle nous vous",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(user2)
            
            # Compte bancaire User 2
            account2 = Account(
                id="account-il-elle-1",
                household_id=household2.id,
                name="Compte Épargne",
                type=AccountType.SAVINGS,
                initial_balance=Decimal("500.00"),
                original_owner_user_id=user2.id,  # NOUVEAU: Track du propriétaire
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(account2)
            
            # Catégories User 2 (copie simple)
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
            
            # Transactions User 2 (3 transactions)
            transactions2 = [
                # Salaire (passé)
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
                # Shopping (passé)
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
                # Spotify (futur)
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
            
            print(f"   ✅ Created household: {household2.name}")
            print(f"   ✅ Created user: {user2.email}")
            print(f"   ✅ Created account: {account2.name} ({account2.initial_balance}€)")
            print(f"   ✅ Created {len(categories2)} categories")
            print(f"   ✅ Created {len(transactions2)} transactions")
            
            # Commit all
            await db.commit()
            
            print("\n" + "="*60)
            print("✅ DATABASE SEEDED SUCCESSFULLY!")
            print("="*60)
            print("\n📧 Test Credentials:")
            print("\n   User 1:")
            print("   Email:    moi.toi@test.com")
            print("   Password: password123")
            print("   Balance:  1000€ initial + transactions = ~3233.51€")
            print("\n   User 2:")
            print("   Email:    il.elle@test.com")
            print("   Password: password123")
            print("   Balance:  500€ initial + transactions = ~2170.01€")
            print("\n💡 Tips:")
            print("   - Connecte-toi avec User 1")
            print("   - Va dans Settings → Invitations")
            print("   - Invite il.elle@test.com")
            print("   - Connecte-toi avec User 2 et accepte")
            print("   - Tu verras la fusion COUPLE avec 3 wallets!")
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
