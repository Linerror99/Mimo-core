"""Service pour gérer les households (Sprint 6 - Mode Couple)."""
from datetime import datetime
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.models import (
    Household,
    HouseholdType,
    HouseholdStatus,
    User,
    Account,
    Transaction,
    TransactionOwnerType,
    Category,
    Notification,
    NotificationType,
)


class HouseholdService:
    """Service pour gérer les households et leurs fusions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def merge_households(
        self,
        household1_id: str,
        household2_id: str,
        new_household_name: str,
    ) -> Household:
        """
        Fusionner deux households INDIVIDUAL en un nouveau household COUPLE.
        
        Cette méthode critique effectue :
        1. Validation (INDIVIDUAL + ACTIVE pour les 2)
        2. Création du nouveau household COUPLE
        3. Migration des users, accounts, transactions, categories
        4. Attribution des transactions (owner_type=PERSONAL + owner_user_id)
        5. Déduplication des catégories
        6. Marquage des anciens households comme MERGED_INTO_COUPLE
        7. Création de notifications
        
        Args:
            household1_id: ID du premier household
            household2_id: ID du deuxième household
            new_household_name: Nom du nouveau household couple
            
        Returns:
            Household: Le nouveau household COUPLE créé
            
        Raises:
            ValueError: Si les validations échouent
        """
        # Validation 1: Pas le même household
        if household1_id == household2_id:
            raise ValueError("Impossible de fusionner le même household avec lui-même")
        
        # Récupérer les 2 households
        household1 = await self._get_household(household1_id)
        household2 = await self._get_household(household2_id)
        
        # Validation 2: Les 2 doivent être INDIVIDUAL
        if household1.type != HouseholdType.INDIVIDUAL or household2.type != HouseholdType.INDIVIDUAL:
            raise ValueError("Seuls les households INDIVIDUAL peuvent être fusionnés")
        
        # Validation 3: Les 2 doivent être ACTIVE
        if household1.status != HouseholdStatus.ACTIVE or household2.status != HouseholdStatus.ACTIVE:
            raise ValueError("Seuls les households ACTIVE peuvent être fusionnés")
        
        # Étape 1: Créer le nouveau household COUPLE
        new_household = Household(
            id=str(uuid.uuid4()),
            name=new_household_name,
            type=HouseholdType.COUPLE,
            status=HouseholdStatus.ACTIVE,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(new_household)
        await self.db.flush()  # Obtenir l'ID pour les FK
        
        # Étape 2: Récupérer les users de chaque household pour l'attribution
        stmt = select(User).where(User.household_id == household1_id)
        users_h1 = list((await self.db.execute(stmt)).scalars().all())
        
        stmt = select(User).where(User.household_id == household2_id)
        users_h2 = list((await self.db.execute(stmt)).scalars().all())
        
        # Pour simplification, on prend le premier user de chaque household
        # (Dans un INDIVIDUAL il n'y a normalement qu'un seul user)
        user1_id = users_h1[0].id if users_h1 else None
        user2_id = users_h2[0].id if users_h2 else None
        
        # Étape 3: Migrer les users
        await self.db.execute(
            update(User)
            .where(User.household_id.in_([household1_id, household2_id]))
            .values(household_id=new_household.id)
        )
        
        # Étape 4: Migrer les accounts
        await self.db.execute(
            update(Account)
            .where(Account.household_id.in_([household1_id, household2_id]))
            .values(household_id=new_household.id)
        )
        
        # Étape 5: Migrer les transactions avec attribution owner
        # Transactions de household1 → owner_user_id = user1
        if user1_id:
            await self.db.execute(
                update(Transaction)
                .where(Transaction.household_id == household1_id)
                .values(
                    household_id=new_household.id,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user1_id,
                )
            )
        
        # Transactions de household2 → owner_user_id = user2
        if user2_id:
            await self.db.execute(
                update(Transaction)
                .where(Transaction.household_id == household2_id)
                .values(
                    household_id=new_household.id,
                    owner_type=TransactionOwnerType.PERSONAL,
                    owner_user_id=user2_id,
                )
            )
        
        # Étape 6: Migrer les catégories avec déduplication
        await self._migrate_categories_with_deduplication(
            household1_id, household2_id, new_household.id
        )
        
        # Étape 7: Marquer les anciens households comme MERGED_INTO_COUPLE
        now = datetime.utcnow()
        household1.status = HouseholdStatus.MERGED_INTO_COUPLE
        household1.merged_into_household_id = new_household.id
        household1.archived_at = now
        household1.updated_at = now
        
        household2.status = HouseholdStatus.MERGED_INTO_COUPLE
        household2.merged_into_household_id = new_household.id
        household2.archived_at = now
        household2.updated_at = now
        
        # Étape 8: Créer des notifications pour les users
        if user1_id:
            notification1 = Notification(
                id=str(uuid.uuid4()),
                user_id=user1_id,
                household_id=new_household.id,
                type=NotificationType.INFO,
                title="Household fusionné",
                message=f"Votre household a été fusionné avec succès dans '{new_household_name}'",
                created_at=now,
            )
            self.db.add(notification1)
        
        if user2_id:
            notification2 = Notification(
                id=str(uuid.uuid4()),
                user_id=user2_id,
                household_id=new_household.id,
                type=NotificationType.INFO,
                title="Household fusionné",
                message=f"Votre household a été fusionné avec succès dans '{new_household_name}'",
                created_at=now,
            )
            self.db.add(notification2)
        
        # Commit toutes les modifications
        await self.db.commit()
        await self.db.refresh(new_household)
        
        return new_household

    async def _migrate_categories_with_deduplication(
        self,
        household1_id: str,
        household2_id: str,
        new_household_id: str,
    ) -> None:
        """
        Migrer les catégories en dédupliquant celles avec le même nom.
        
        Si une catégorie existe dans les 2 households avec le même nom,
        on garde celle de household1 et on redirige les transactions de household2.
        """
        # Récupérer toutes les catégories des 2 households
        stmt = select(Category).where(
            Category.household_id.in_([household1_id, household2_id])
        )
        all_categories = list((await self.db.execute(stmt)).scalars().all())
        
        # Grouper par nom
        categories_by_name: dict[str, list[Category]] = {}
        for category in all_categories:
            if category.name not in categories_by_name:
                categories_by_name[category.name] = []
            categories_by_name[category.name].append(category)
        
        # Pour chaque groupe de catégories avec le même nom
        for name, categories in categories_by_name.items():
            if len(categories) == 1:
                # Pas de duplication, juste migrer
                categories[0].household_id = new_household_id
            else:
                # Duplication détectée: garder la première, supprimer les autres
                # et réaffecter les transactions
                main_category = categories[0]
                main_category.household_id = new_household_id
                
                for duplicate_category in categories[1:]:
                    # Réaffecter les transactions de la catégorie dupliquée vers la principale
                    await self.db.execute(
                        update(Transaction)
                        .where(Transaction.category_id == duplicate_category.id)
                        .values(category_id=main_category.id)
                    )
                    
                    # Supprimer la catégorie dupliquée
                    await self.db.delete(duplicate_category)

    async def _get_household(self, household_id: str) -> Household:
        """Récupérer un household par ID."""
        stmt = select(Household).where(Household.id == household_id)
        household = (await self.db.execute(stmt)).scalar_one_or_none()
        
        if not household:
            raise ValueError("Household not found")
        
        return household

    async def calculate_wallets(self, household_id: str) -> dict:
        """
        Calculer les 3 portefeuilles pour un household COUPLE.
        
        Retourne un dictionnaire avec les balances de chaque membre et du commun:
        {
            "total_balance": float,
            "members": {
                "user1_id": {
                    "user_id": str,
                    "balance": float,
                    "personal_balance": float,
                    "shared_contribution": float,
                },
                "user2_id": {...}
            },
            "shared": {
                "balance": float,
                "split_per_person": float,
            }
        }
        
        Logique:
        - Initial Balance: Somme des initial_balance de tous les comptes du household
        - Personal Transactions: Somme des transactions avec owner_type=PERSONAL + owner_user_id=user
        - Shared Transactions: Somme des transactions avec owner_type=SHARED
        - Shared Contribution: Shared Transactions / nombre de membres
        - Balance Membre: Initial Balance + Personal Transactions + Shared Contribution
        - Total Balance: Initial Balance + All Transactions (PERSONAL + SHARED + NULL)
        
        Args:
            household_id: ID du household COUPLE
            
        Returns:
            dict: Dictionnaire avec les 3 vues de portefeuilles
            
        Raises:
            ValueError: Si le household n'existe pas ou n'est pas COUPLE
        """
        from sqlalchemy import func
        from decimal import Decimal
        
        # Récupérer le household
        household = await self._get_household(household_id)
        
        if household.type != HouseholdType.COUPLE:
            raise ValueError("Wallet calculation is only available for COUPLE households")
        
        # Récupérer les membres (users)
        stmt = select(User).where(User.household_id == household_id)
        members = list((await self.db.execute(stmt)).scalars().all())
        
        if len(members) != 2:
            raise ValueError("COUPLE household must have exactly 2 members")
        
        user1, user2 = members[0], members[1]
        
        # Récupérer tous les comptes du household et leur solde initial
        stmt = select(Account).where(Account.household_id == household_id)
        accounts = list((await self.db.execute(stmt)).scalars().all())
        
        # Solde initial de tous les comptes
        initial_balance = sum(Decimal(str(acc.initial_balance)) for acc in accounts)
        
        # Calculer les transactions PERSONAL pour chaque user
        # User 1 personal transactions
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.household_id == household_id,
            Transaction.owner_type == TransactionOwnerType.PERSONAL,
            Transaction.owner_user_id == user1.id,
            Transaction.deleted_at.is_(None),
        )
        user1_personal = Decimal(str((await self.db.execute(stmt)).scalar()))
        
        # User 2 personal transactions
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.household_id == household_id,
            Transaction.owner_type == TransactionOwnerType.PERSONAL,
            Transaction.owner_user_id == user2.id,
            Transaction.deleted_at.is_(None),
        )
        user2_personal = Decimal(str((await self.db.execute(stmt)).scalar()))
        
        # Calculer les transactions SHARED
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.household_id == household_id,
            Transaction.owner_type == TransactionOwnerType.SHARED,
            Transaction.deleted_at.is_(None),
        )
        shared_total = Decimal(str((await self.db.execute(stmt)).scalar()))
        
        # Calculer les transactions NULL (mode INDIVIDUAL avant fusion)
        stmt = select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.household_id == household_id,
            Transaction.owner_type.is_(None),
            Transaction.deleted_at.is_(None),
        )
        null_transactions = Decimal(str((await self.db.execute(stmt)).scalar()))
        
        # Split 50/50 pour SHARED
        num_members = Decimal("2.00")
        shared_per_person = shared_total / num_members
        
        # Calculer les balances finales
        # Chaque membre: initial_balance + ses transactions personal + sa part des shared
        user1_balance = initial_balance + user1_personal + shared_per_person
        user2_balance = initial_balance + user2_personal + shared_per_person
        
        # Total balance du household
        # = initial_balance + toutes les transactions (PERSONAL + SHARED + NULL)
        total_balance = initial_balance + user1_personal + user2_personal + shared_total + null_transactions
        
        return {
            "total_balance": float(total_balance),
            "members": {
                user1.id: {
                    "user_id": user1.id,
                    "user_name": f"{user1.first_name} {user1.last_name}",
                    "balance": float(user1_balance),
                    "personal_balance": float(user1_personal),
                    "shared_contribution": float(shared_per_person),
                },
                user2.id: {
                    "user_id": user2.id,
                    "user_name": f"{user2.first_name} {user2.last_name}",
                    "balance": float(user2_balance),
                    "personal_balance": float(user2_personal),
                    "shared_contribution": float(shared_per_person),
                },
            },
            "shared": {
                "balance": float(shared_total),
                "split_per_person": float(shared_per_person),
            },
        }
