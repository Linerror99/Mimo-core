"""
MIMO FINANCE - Test Data Seeding Script
========================================
Generate fake data for testing and development:
- 100+ users
- 100+ households
- 1000+ transactions
- Categories, accounts, goals
"""
import asyncio
import random
import sys
from pathlib import Path
from datetime import datetime, date, timedelta
from decimal import Decimal
from faker import Faker
from sqlalchemy import select

# Add parent directory to path to allow imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.household import Household, HouseholdType
from app.models.account import Account, AccountType
from app.models.category import Category, CategoryType
from app.models.transaction import Transaction, TransactionType, TransactionState, TransactionOwnerType, RecurrenceFrequency
from app.models.goal import Goal
from app.services.auth import AuthService

fake = Faker('fr_FR')  # French locale

# Configuration
NUM_USERS = 100
NUM_TRANSACTIONS_PER_USER = 20

# Default categories
DEFAULT_INCOME_CATEGORIES = [
    ("💼 Salaire", "#27AE60"),
    ("🎁 Primes", "#2ECC71"),
    ("📈 Investissements", "#16A085"),
    ("🏠 Loyers perçus", "#1ABC9C"),
    ("💰 Autres revenus", "#52B788"),
]

DEFAULT_EXPENSE_CATEGORIES = [
    ("🏠 Logement", "#E74C3C"),
    ("🛒 Courses", "#E67E22"),
    ("🚗 Transport", "#F39C12"),
    ("⚡ Énergie", "#D35400"),
    ("📱 Abonnements", "#C0392B"),
    ("🍽️ Restaurants", "#BDC3C7"),
    ("🎉 Loisirs", "#95A5A6"),
    ("👕 Shopping", "#7F8C8D"),
    ("🏥 Santé", "#34495E"),
    ("📚 Éducation", "#2C3E50"),
]


async def create_categories(db, household_id):
    """Create default categories for a household"""
    categories = []
    
    # Income categories
    for idx, (name, color) in enumerate(DEFAULT_INCOME_CATEGORIES):
        cat = Category(
            id=f"cat-income-{household_id}-{idx}",
            household_id=household_id,
            name=name,
            type=CategoryType.INCOME,
            icon=name.split()[0],  # Extract emoji
            color=color
        )
        categories.append(cat)
        db.add(cat)
    
    # Expense categories
    for idx, (name, color) in enumerate(DEFAULT_EXPENSE_CATEGORIES):
        cat = Category(
            id=f"cat-expense-{household_id}-{idx}",
            household_id=household_id,
            name=name,
            type=CategoryType.EXPENSE,
            icon=name.split()[0],  # Extract emoji
            color=color
        )
        categories.append(cat)
        db.add(cat)
    
    return categories


async def create_users(db, num_users):
    """Create fake users with households"""
    print(f"👥 Creating {num_users} users with households...")
    
    users = []
    households = []
    
    for i in range(num_users):
        first_name = fake.first_name()
        last_name = fake.last_name()
        email = f"{first_name.lower()}.{last_name.lower()}{i}@test.com"
        
        # Create household for user
        household = Household(
            id=f"household-{i}",
            name=f"Foyer {first_name} {last_name}",
            type=HouseholdType.INDIVIDUAL,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(household)
        households.append(household)
        
        # Create user
        user = User(
            id=f"user-{i}",
            household_id=household.id,
            email=email,
            password_hash=AuthService.hash_password("password123"),
            first_name=first_name,
            last_name=last_name,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(user)
        users.append(user)
    
    await db.commit()
    print(f"✅ Created {len(users)} users with households")
    return users, households


async def create_accounts(db, households, users):
    """Create bank accounts for each household"""
    print("💳 Creating accounts...")
    
    accounts = []
    account_types = [AccountType.CHECKING, AccountType.SAVINGS, AccountType.CASH]
    user_map = {user.household_id: user for user in users}
    
    for idx, household in enumerate(households):
        # Each household has 1-2 accounts
        num_accounts = random.randint(1, 2)
        user = user_map.get(household.id)
        
        for i in range(num_accounts):
            account = Account(
                id=f"account-{idx}-{i}",
                household_id=household.id,
                name=f"{random.choice(['Compte Courant', 'Livret A', 'Épargne', 'Liquide'])} {i+1}",
                type=random.choice(account_types),
                initial_balance=Decimal(random.uniform(500, 10000)),
                original_owner_user_id=user.id if user else None,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            accounts.append(account)
            db.add(account)
    
    await db.commit()
    print(f"✅ Created {len(accounts)} accounts")
    return accounts


async def create_transactions(db, households, accounts, all_categories, users):
    """Create transactions"""
    print("💸 Creating transactions...")
    
    # Group accounts and categories by household
    household_accounts = {}
    household_categories = {}
    household_users = {}
    
    for account in accounts:
        if account.household_id not in household_accounts:
            household_accounts[account.household_id] = []
        household_accounts[account.household_id].append(account)
    
    for cats in all_categories:
        for cat in cats:
            if cat.household_id not in household_categories:
                household_categories[cat.household_id] = []
            household_categories[cat.household_id].append(cat)
    
    for user in users:
        household_users[user.household_id] = user
    
    tx_count = 0
    today = date.today()
    
    for household in households:
        if household.id not in household_accounts or household.id not in household_categories:
            continue
        
        h_accounts = household_accounts[household.id]
        h_categories = household_categories[household.id]
        h_user = household_users.get(household.id)
        
        income_cats = [c for c in h_categories if c.type == CategoryType.INCOME]
        expense_cats = [c for c in h_categories if c.type == CategoryType.EXPENSE]
        
        if not income_cats or not expense_cats or not h_user:
            continue
        
        # Create transactions
        for i in range(NUM_TRANSACTIONS_PER_USER):
            days_ago = random.randint(0, 180)
            trans_date = today - timedelta(days=days_ago)
            
            # 70% expenses, 30% income
            trans_type = TransactionType.EXPENSE if random.random() < 0.7 else TransactionType.INCOME
            category = random.choice(expense_cats if trans_type == TransactionType.EXPENSE else income_cats)
            
            # Amount
            if trans_type == TransactionType.INCOME:
                amount = Decimal(random.uniform(500, 3000))
            else:
                amount = Decimal(random.uniform(5, 500))
            
            transaction = Transaction(
                id=f"tx-{household.id}-{i}",
                household_id=household.id,
                account_id=random.choice(h_accounts).id,
                category_id=category.id,
                type=trans_type,
                amount=amount if trans_type == TransactionType.INCOME else -amount,
                description=fake.sentence(nb_words=6),
                transaction_date=trans_date,
                state=TransactionState.REALIZED,
                recurrence_frequency=RecurrenceFrequency.NONE,
                owner_type=TransactionOwnerType.PERSONAL,
                owner_user_id=h_user.id,
            )
            db.add(transaction)
            tx_count += 1
    
    await db.commit()
    print(f"✅ Created {tx_count} transactions")


async def create_goals(db, users):
    """Create savings goals"""
    print("🎯 Creating goals...")
    
    goal_names = [
        ("🏖️ Vacances", 3000, 5000),
        ("🚗 Nouvelle voiture", 15000, 25000),
        ("🏠 Apport maison", 50000, 100000),
        ("💍 Mariage", 10000, 20000),
        ("📱 Nouveau téléphone", 800, 1500),
        ("🎓 Études", 5000, 15000),
    ]
    
    goal_count = 0
    today = date.today()
    
    for idx, user in enumerate(users):
        # 2-3 personal goals per user
        for i in range(random.randint(2, 3)):
            goal_name, min_amount, max_amount = random.choice(goal_names)
            target_amount = Decimal(random.uniform(min_amount, max_amount))
            current_amount = Decimal(random.uniform(0, float(target_amount) * 0.7))
            
            # Target date in 6-24 months
            target_date = today + timedelta(days=random.randint(180, 720))
            
            goal = Goal(
                id=f"goal-{idx}-{i}",
                user_id=user.id,
                household_id=None,  # Personal goal
                created_by=user.id,
                name=goal_name,
                target_amount=target_amount,
                current_amount=current_amount,
                target_date=target_date,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(goal)
            goal_count += 1
    
    await db.commit()
    print(f"✅ Created {goal_count} personal goals")


async def main():
    """Main seeding function"""
    print("=" * 60)
    print("  MIMO FINANCE - Test Data Generation")
    print("=" * 60)
    print()
    
    async with AsyncSessionLocal() as db:
        try:
            # Check if data already exists
            result = await db.execute(select(User))
            existing_users = result.scalars().all()
            
            if len(existing_users) > 10:
                print(f"⚠️  Database already has {len(existing_users)} users")
                response = input("Continue and add more data? [y/N]: ")
                if response.lower() != 'y':
                    print("❌ Seeding cancelled")
                    return
            
            # Create data
            print()
            users, households = await create_users(db, NUM_USERS)
            
            print("📁 Creating categories...")
            all_categories = []
            for household in households:
                cats = await create_categories(db, household.id)
                all_categories.append(cats)
            await db.commit()
            print(f"✅ Created categories for {len(households)} households")
            
            accounts = await create_accounts(db, households, users)
            await create_transactions(db, households, accounts, all_categories, users)
            await create_goals(db, users)
            
            print()
            print("=" * 60)
            print("  ✅ Test Data Generation Complete!")
            print("=" * 60)
            print()
            print(f"📊 Summary:")
            print(f"   • Users: {len(users)}")
            print(f"   • Households: {len(households)}")
            print(f"   • Accounts: {len(accounts)}")
            print(f"   • Transactions: ~{len(households) * NUM_TRANSACTIONS_PER_USER}")
            print(f"   • Categories: {len(households) * 15}")
            print()
            print("🔐 All users have password: password123")
            print()
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            await db.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
