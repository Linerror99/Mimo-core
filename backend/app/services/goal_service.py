"""
Goal Service

Gère les objectifs d'épargne pour les foyers ET les utilisateurs individuels.
Calcule automatiquement la progression via les transactions.

Règles:
- Objectif personnel: user_id renseigné, household_id NULL
- Objectif de foyer: household_id renseigné, user_id NULL
- Jamais les deux en même temps (contrainte CHECK en DB)
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

from app.models.goal import Goal
from app.models.transaction import Transaction, TransactionState
from app.models.household import Household
from app.models.account import Account


class GoalService:
    """
    Service de gestion des objectifs d'épargne
    
    Fonctionnalités:
    - CRUD objectifs (personnels ou de foyer)
    - Calcul progression automatique
    - Validation business rules
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_goal(
        self,
        created_by: str,
        name: str,
        target_amount: float,
        user_id: Optional[str] = None,
        household_id: Optional[str] = None,
        description: Optional[str] = None,
        target_date: Optional[date] = None
    ) -> Goal:
        """
        Crée un nouvel objectif d'épargne
        
        Args:
            created_by: ID de l'utilisateur créateur
            name: Nom de l'objectif
            target_amount: Montant cible
            user_id: ID du user (objectif personnel) - exclusif avec household_id
            household_id: ID du foyer (objectif de foyer) - exclusif avec user_id
            description: Description optionnelle
            target_date: Date cible optionnelle
        
        Returns:
            Goal créé
        
        Raises:
            ValueError: Si montant cible <= 0 ou si user_id et household_id invalides
        """
        # Validation: SOIT user_id SOIT household_id (exclusif)
        if user_id is None and household_id is None:
            raise ValueError("Vous devez fournir user_id ou household_id")
        
        if user_id is not None and household_id is not None:
            raise ValueError("Vous devez fournir user_id ou household_id exclusivement, pas les deux")
        
        # Validation montant
        if target_amount <= 0:
            raise ValueError("Le montant cible doit être positif")
        
        # Créer objectif
        goal = Goal(
            user_id=user_id,
            household_id=household_id,
            created_by=created_by,
            name=name,
            target_amount=Decimal(str(target_amount)),
            description=description,
            target_date=target_date,
            current_amount=Decimal("0")
        )
        
        self.db.add(goal)
        await self.db.commit()
        await self.db.refresh(goal)
        
        return goal
    
    async def get_goal(self, goal_id: str) -> Optional[Goal]:
        """Récupère un objectif par ID"""
        result = await self.db.execute(
            select(Goal).where(Goal.id == goal_id)
        )
        return result.scalar_one_or_none()
    
    async def list_goals(
        self,
        user_id: Optional[str] = None,
        household_id: Optional[str] = None
    ) -> List[Goal]:
        """
        Liste les objectifs d'un user OU d'un household
        
        Args:
            user_id: ID du user (objectifs personnels)
            household_id: ID du foyer (objectifs de foyer)
        
        Returns:
            Liste des objectifs
        """
        if user_id:
            result = await self.db.execute(
                select(Goal)
                .where(Goal.user_id == user_id)
                .order_by(Goal.created_at.desc())
            )
        elif household_id:
            result = await self.db.execute(
                select(Goal)
                .where(Goal.household_id == household_id)
                .order_by(Goal.created_at.desc())
            )
        else:
            return []
        
        return list(result.scalars().all())
    
    async def update_goal(
        self,
        goal_id: str,
        name: Optional[str] = None,
        target_amount: Optional[float] = None,
        description: Optional[str] = None,
        target_date: Optional[date] = None
    ) -> Goal:
        """
        Met à jour un objectif
        
        Args:
            goal_id: ID de l'objectif
            name: Nouveau nom (optionnel)
            target_amount: Nouveau montant cible (optionnel)
            description: Nouvelle description (optionnel)
            target_date: Nouvelle date cible (optionnel)
        
        Returns:
            Goal mis à jour
        
        Raises:
            ValueError: Si objectif introuvable ou montant invalide
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Objectif {goal_id} introuvable")
        
        # Mettre à jour champs fournis
        if name is not None:
            goal.name = name
        if target_amount is not None:
            if target_amount <= 0:
                raise ValueError("Le montant cible doit être positif")
            goal.target_amount = Decimal(str(target_amount))
        if description is not None:
            goal.description = description
        if target_date is not None:
            goal.target_date = target_date
        
        await self.db.commit()
        await self.db.refresh(goal)
        
        return goal
    
    async def delete_goal(self, goal_id: str) -> None:
        """
        Supprime un objectif
        
        Args:
            goal_id: ID de l'objectif
        
        Raises:
            ValueError: Si objectif introuvable
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Objectif {goal_id} introuvable")
        
        await self.db.delete(goal)
        await self.db.commit()
    
    async def calculate_progress(self, goal_id: str) -> Goal:
        """
        Calcule la progression d'un objectif via les transactions
        
        Logique:
        - Somme des INCOME REALIZED du household
        - Exclus les EXPENSE
        - Met à jour current_amount
        
        Args:
            goal_id: ID de l'objectif
        
        Returns:
            Goal avec progression mise à jour
        
        Raises:
            ValueError: Si objectif introuvable
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Objectif {goal_id} introuvable")
        
        # Calculer total des revenus réalisés depuis création de l'objectif
        result = await self.db.execute(
            select(func.sum(Transaction.amount))
            .where(
                and_(
                    Transaction.household_id == goal.household_id,
                    Transaction.state == TransactionState.REALIZED,
                    Transaction.transaction_date >= goal.created_at.date()
                )
            )
        )
        
        total_income = result.scalar() or Decimal("0")
        
        # Mettre à jour montant actuel
        goal.current_amount = max(Decimal("0"), total_income)
        
        await self.db.commit()
        await self.db.refresh(goal)
        
        return goal
    
    async def update_contribution(
        self,
        goal_id: str,
        amount: float
    ) -> Goal:
        """
        Ajoute une contribution manuelle à un objectif
        
        Args:
            goal_id: ID de l'objectif
            amount: Montant à ajouter (peut être négatif pour retrait)
        
        Returns:
            Goal mis à jour
        
        Raises:
            ValueError: Si objectif introuvable ou montant invalide
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Objectif {goal_id} introuvable")
        
        # Ajouter contribution
        new_amount = goal.current_amount + Decimal(str(amount))
        
        # Empêcher montant négatif
        if new_amount < 0:
            raise ValueError("Le montant actuel ne peut pas être négatif")
        
        goal.current_amount = new_amount
        
        await self.db.commit()
        await self.db.refresh(goal)
        
        return goal
    
    async def set_contribution(
        self,
        goal_id: str,
        amount: float,
        user_id: str,
        household_id: Optional[str] = None
    ) -> Goal:
        """
        Définit le montant actuel d'un objectif (remplace au lieu d'ajouter)
        
        Args:
            goal_id: ID de l'objectif
            amount: Nouveau montant actuel
            user_id: ID de l'utilisateur (pour validation)
            household_id: ID du foyer (pour validation)
        
        Returns:
            Goal mis à jour
        
        Raises:
            ValueError: Si objectif introuvable ou montant invalide
        """
        goal = await self.get_goal(goal_id)
        if not goal:
            raise ValueError(f"Objectif {goal_id} introuvable")
        
        amount_decimal = Decimal(str(amount))
        
        # Empêcher montant négatif
        if amount_decimal < 0:
            raise ValueError("Le montant actuel ne peut pas être négatif")
        
        # Plafonner au target_amount pour éviter dépassement
        if amount_decimal > goal.target_amount:
            amount_decimal = goal.target_amount
        
        # Déterminer si c'est un objectif foyer
        is_household_goal = goal.household_id is not None
        
        # Validation du solde disponible
        is_valid, error_msg = await self.validate_contribution_amount(
            user_id=user_id,
            household_id=household_id,
            new_amount=amount_decimal,
            is_household_goal=is_household_goal,
            goal_id=goal_id
        )
        
        if not is_valid:
            raise ValueError(error_msg)
        
        goal.current_amount = amount_decimal
        
        await self.db.commit()
        await self.db.refresh(goal)
        
        return goal
    
    async def get_available_balance(
        self,
        user_id: str,
        household_id: Optional[str] = None,
        is_household_goal: bool = False
    ) -> Decimal:
        """
        Calcule le solde disponible pour les objectifs
        
        - Objectif personnel: somme des soldes des comptes de l'utilisateur uniquement
        - Objectif foyer: somme des soldes des comptes du household (les deux partenaires)
        
        Args:
            user_id: ID de l'utilisateur
            household_id: ID du foyer (optionnel)
            is_household_goal: True si c'est un objectif foyer, False sinon
        
        Returns:
            Solde total disponible
        """
        from app.models.transaction import Transaction
        from app.models.account import Account
        
        if is_household_goal and household_id:
            # Objectif foyer: somme des comptes du household (couple)
            accounts_result = await self.db.execute(
                select(Account.id, Account.initial_balance)
                .where(Account.household_id == household_id)
            )
            accounts = accounts_result.all()
        else:
            # Objectif personnel: somme des comptes de l'utilisateur uniquement
            accounts_result = await self.db.execute(
                select(Account.id, Account.initial_balance)
                .where(Account.original_owner_user_id == user_id)
            )
            accounts = accounts_result.all()
        
        # Calculer le solde pour chaque compte (initial_balance + transactions)
        total_balance = Decimal("0")
        for account in accounts:
            account_id, initial_balance = account
            
            # Somme des transactions pour ce compte
            transactions_result = await self.db.execute(
                select(func.coalesce(func.sum(Transaction.amount), 0))
                .where(
                    Transaction.account_id == account_id,
                    Transaction.deleted_at.is_(None)
                )
            )
            transactions_sum = transactions_result.scalar_one()
            
            # Balance du compte = initial + transactions
            account_balance = initial_balance + Decimal(str(transactions_sum))
            total_balance += account_balance
        
        return total_balance
    
    async def get_allocated_amount(
        self,
        user_id: str,
        household_id: Optional[str] = None,
        exclude_goal_id: Optional[str] = None
    ) -> Decimal:
        """
        Calcule le montant déjà alloué aux objectifs
        
        Somme des current_amount de tous les objectifs (personnels + foyer si applicable)
        
        Args:
            user_id: ID de l'utilisateur
            household_id: ID du foyer (optionnel)
            exclude_goal_id: ID d'un objectif à exclure (pour modification)
        
        Returns:
            Montant total alloué
        """
        # Objectifs personnels
        query_personal = select(func.sum(Goal.current_amount)).where(Goal.user_id == user_id)
        if exclude_goal_id:
            query_personal = query_personal.where(Goal.id != exclude_goal_id)
        
        result_personal = await self.db.execute(query_personal)
        allocated_personal = result_personal.scalar() or Decimal("0")
        
        # Objectifs de foyer (si en couple)
        allocated_household = Decimal("0")
        if household_id:
            query_household = select(func.sum(Goal.current_amount)).where(Goal.household_id == household_id)
            if exclude_goal_id:
                query_household = query_household.where(Goal.id != exclude_goal_id)
            
            result_household = await self.db.execute(query_household)
            allocated_household = result_household.scalar() or Decimal("0")
        
        return allocated_personal + allocated_household
    
    async def validate_contribution_amount(
        self,
        user_id: str,
        household_id: Optional[str],
        new_amount: Decimal,
        is_household_goal: bool = False,
        goal_id: Optional[str] = None
    ) -> tuple[bool, str]:
        """
        Valide qu'un montant de contribution ne dépasse pas le solde disponible
        
        Args:
            user_id: ID de l'utilisateur
            household_id: ID du foyer (si applicable)
            new_amount: Nouveau montant à allouer
            is_household_goal: True si c'est un objectif foyer
            goal_id: ID de l'objectif en cours de modification (pour exclure de la somme)
        
        Returns:
            Tuple (is_valid, error_message)
        """
        available_balance = await self.get_available_balance(user_id, household_id, is_household_goal)
        allocated_amount = await self.get_allocated_amount(user_id, household_id, goal_id)
        
        # Calculer ce qui reste
        remaining_balance = available_balance - allocated_amount
        
        if new_amount > remaining_balance:
            return False, f"Solde insuffisant. Disponible: {remaining_balance}€, Demandé: {new_amount}€"
        
        return True, ""
