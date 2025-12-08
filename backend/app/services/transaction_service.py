"""
Transaction Service

Business logic for transaction operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from datetime import datetime, date
from typing import Optional, List

from app.models.transaction import Transaction, TransactionType, TransactionState, RecurrenceFrequency
from app.models.account import Account
from app.models.household import Household
from app.schemas.transaction import TransactionCreate, TransactionUpdate, RecurringTransactionCreate
from app.services.notification_service import NotificationService


class TransactionService:
    """Service pour gérer les transactions"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_transaction(
        self,
        household_id: str,
        transaction_data: TransactionCreate
    ) -> Transaction:
        """
        Créer une transaction ponctuelle
        
        Args:
            household_id: ID du foyer
            transaction_data: Données de la transaction
            
        Returns:
            Transaction créée
        """
        # Déterminer l'état selon la date
        today = date.today()
        if transaction_data.transaction_date < today:
            state = TransactionState.REALIZED
        elif transaction_data.transaction_date == today:
            state = TransactionState.PENDING
        else:
            state = TransactionState.PROJECTED
        
        transaction = Transaction(
            household_id=household_id,
            account_id=transaction_data.account_id,
            category_id=transaction_data.category_id,
            destination_account_id=transaction_data.destination_account_id,
            description=transaction_data.description,
            amount=transaction_data.amount,
            transaction_date=transaction_data.transaction_date,
            type=transaction_data.type,
            state=state,
            notes=transaction_data.notes,
            recurrence_frequency=RecurrenceFrequency.NONE
        )
        
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)
        
        # Si la transaction est PENDING, créer des notifications pour tous les membres du foyer
        if state == TransactionState.PENDING:
            # Charger le household avec ses membres
            result = await self.db.execute(
                select(Account)
                .options(selectinload(Account.household).selectinload(Household.members))
                .where(Account.id == transaction_data.account_id)
            )
            account = result.scalar_one_or_none()
            
            if account and account.household:
                for member in account.household.members:
                    await NotificationService.create_validation_notification(
                        db=self.db,
                        user_id=member.id,
                        household_id=account.household_id,
                        transaction_id=transaction.id,
                        transaction_description=transaction.description,
                        transaction_amount=float(transaction.amount)
                    )
        
        return transaction
    
    async def create_recurring_transaction(
        self,
        household_id: str,
        transaction_data: RecurringTransactionCreate
    ) -> Transaction:
        """
        Créer une transaction récurrente (template)
        
        Args:
            household_id: ID du foyer
            transaction_data: Données de la transaction récurrente
            
        Returns:
            Transaction récurrente créée
        """
        # Déterminer l'état selon la date
        today = date.today()
        if transaction_data.transaction_date < today:
            state = TransactionState.REALIZED
        elif transaction_data.transaction_date == today:
            state = TransactionState.PENDING
        else:
            state = TransactionState.PROJECTED
        
        transaction = Transaction(
            household_id=household_id,
            account_id=transaction_data.account_id,
            category_id=transaction_data.category_id,
            destination_account_id=transaction_data.destination_account_id,
            description=transaction_data.description,
            amount=transaction_data.amount,
            transaction_date=transaction_data.transaction_date,
            type=transaction_data.type,
            state=state,
            notes=transaction_data.notes,
            recurrence_frequency=transaction_data.recurrence_frequency,
            recurrence_end_date=transaction_data.recurrence_end_date
        )
        
        self.db.add(transaction)
        await self.db.commit()
        await self.db.refresh(transaction)
        
        # Si la transaction est PENDING, créer des notifications pour tous les membres du foyer
        if state == TransactionState.PENDING:
            # Charger le household avec ses membres
            result = await self.db.execute(
                select(Account)
                .options(selectinload(Account.household).selectinload(Household.members))
                .where(Account.id == transaction_data.account_id)
            )
            account = result.scalar_one_or_none()
            
            if account and account.household:
                for member in account.household.members:
                    await NotificationService.create_validation_notification(
                        db=self.db,
                        user_id=member.id,
                        household_id=account.household_id,
                        transaction_id=transaction.id,
                        transaction_description=transaction.description,
                        transaction_amount=float(transaction.amount)
                    )
        
        return transaction
    
    async def get_transaction(
        self,
        transaction_id: str,
        household_id: str
    ) -> Optional[Transaction]:
        """
        Récupérer une transaction par ID (avec isolation household)
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            
        Returns:
            Transaction ou None si non trouvée
        """
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.id == transaction_id,
                    Transaction.household_id == household_id
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def list_transactions(
        self,
        household_id: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        transaction_type: Optional[TransactionType] = None,
        account_id: Optional[str] = None,
        category_id: Optional[str] = None,
        state: Optional[TransactionState] = None,
        include_deleted: bool = False
    ) -> List[Transaction]:
        """
        Lister les transactions avec filtres
        
        Args:
            household_id: ID du foyer
            start_date: Date de début (inclusive)
            end_date: Date de fin (inclusive)
            transaction_type: Filtrer par type
            account_id: Filtrer par compte
            category_id: Filtrer par catégorie
            state: Filtrer par état (REALIZED ou PROJECTED)
            include_deleted: Inclure les transactions supprimées
            
        Returns:
            Liste des transactions
        """
        conditions = [Transaction.household_id == household_id]
        
        # Filtre deleted
        if not include_deleted:
            conditions.append(Transaction.deleted_at.is_(None))
        
        # Filtres dates
        if start_date:
            conditions.append(Transaction.transaction_date >= start_date)
        if end_date:
            conditions.append(Transaction.transaction_date <= end_date)
        
        # Filtre type
        if transaction_type:
            conditions.append(Transaction.type == transaction_type)
        
        # Filtre compte
        if account_id:
            conditions.append(Transaction.account_id == account_id)
        
        # Filtre catégorie
        if category_id:
            conditions.append(Transaction.category_id == category_id)
        
        # Filtre state (REALIZED vs PROJECTED)
        # Note: state est une propriété calculée, donc on filtre sur la date
        if state == TransactionState.REALIZED:
            conditions.append(Transaction.transaction_date <= date.today())
        elif state == TransactionState.PROJECTED:
            conditions.append(Transaction.transaction_date > date.today())
        
        result = await self.db.execute(
            select(Transaction)
            .where(and_(*conditions))
            .order_by(Transaction.transaction_date.desc())
        )
        
        return list(result.scalars().all())
    
    async def update_transaction(
        self,
        transaction_id: str,
        household_id: str,
        transaction_data: TransactionUpdate
    ) -> Optional[Transaction]:
        """
        Mettre à jour une transaction
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            transaction_data: Données à mettre à jour
            
        Returns:
            Transaction mise à jour ou None si non trouvée
        """
        transaction = await self.get_transaction(transaction_id, household_id)
        
        if not transaction:
            return None
        
        # Mise à jour des champs fournis
        update_data = transaction_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(transaction, field, value)
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    async def soft_delete_transaction(
        self,
        transaction_id: str,
        household_id: str
    ) -> Optional[Transaction]:
        """
        Supprimer une transaction (soft delete → corbeille)
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            
        Returns:
            Transaction supprimée ou None si non trouvée
        """
        transaction = await self.get_transaction(transaction_id, household_id)
        
        if not transaction:
            return None
        
        transaction.deleted_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    async def restore_transaction(
        self,
        transaction_id: str,
        household_id: str
    ) -> Optional[Transaction]:
        """
        Restaurer une transaction depuis la corbeille
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            
        Returns:
            Transaction restaurée ou None si non trouvée
        """
        # Récupérer même si deleted
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.id == transaction_id,
                    Transaction.household_id == household_id
                )
            )
        )
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            return None
        
        transaction.deleted_at = None
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    async def permanent_delete_transaction(
        self,
        transaction_id: str,
        household_id: str
    ) -> bool:
        """
        Supprimer définitivement une transaction
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            
        Returns:
            True si supprimée, False si non trouvée
        """
        # Récupérer même si deleted
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.id == transaction_id,
                    Transaction.household_id == household_id
                )
            )
        )
        transaction = result.scalar_one_or_none()
        
        if not transaction:
            return False
        
        await self.db.delete(transaction)
        await self.db.commit()
        
        return True
    
    async def list_trash(
        self,
        household_id: str
    ) -> List[Transaction]:
        """
        Lister les transactions dans la corbeille
        
        Args:
            household_id: ID du foyer
            
        Returns:
            Liste des transactions supprimées
        """
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.household_id == household_id,
                    Transaction.deleted_at.is_not(None)
                )
            )
            .order_by(Transaction.deleted_at.desc())
        )
        
        return list(result.scalars().all())
    
    async def validate_transaction(
        self,
        transaction_id: str,
        household_id: str,
        new_amount: Optional[float] = None
    ) -> Optional[Transaction]:
        """
        Valider une transaction PENDING (la marquer comme REALIZED)
        Permet optionnellement de modifier le montant
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            new_amount: Nouveau montant (optionnel)
            
        Returns:
            Transaction validée, ou None si non trouvée
        """
        transaction = await self.get_transaction(transaction_id, household_id)
        
        if not transaction:
            return None
        
        # Modifier le montant si fourni
        if new_amount is not None:
            transaction.amount = new_amount
        
        # Marquer comme validée
        transaction.state = TransactionState.REALIZED
        transaction.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    async def postpone_transaction(
        self,
        transaction_id: str,
        household_id: str,
        new_date: date
    ) -> Optional[Transaction]:
        """
        Reporter une transaction PENDING à une nouvelle date
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            new_date: Nouvelle date
            
        Returns:
            Transaction reportée, ou None si non trouvée
        """
        transaction = await self.get_transaction(transaction_id, household_id)
        
        if not transaction:
            return None
        
        transaction.transaction_date = new_date
        
        # Recalculer l'état selon la nouvelle date
        today = date.today()
        if new_date < today:
            transaction.state = TransactionState.REALIZED
        elif new_date == today:
            transaction.state = TransactionState.PENDING
        else:
            transaction.state = TransactionState.PROJECTED
        
        transaction.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction
    
    async def list_pending_transactions(
        self,
        household_id: str
    ) -> List[Transaction]:
        """
        Lister toutes les transactions PENDING d'un foyer
        
        Args:
            household_id: ID du foyer
            
        Returns:
            Liste des transactions en attente de validation
        """
        result = await self.db.execute(
            select(Transaction)
            .where(
                and_(
                    Transaction.household_id == household_id,
                    Transaction.state == TransactionState.PENDING,
                    Transaction.deleted_at.is_(None)
                )
            )
            .order_by(Transaction.transaction_date.asc())
        )
        
        return list(result.scalars().all())
    
    async def cancel_transaction(
        self,
        transaction_id: str,
        household_id: str,
        reason: Optional[str] = None
    ) -> Transaction:
        """
        Annuler une transaction (PROJECTED ou PENDING uniquement)
        
        Une transaction annulée passe à l'état CANCELLED:
        - Reste visible dans l'historique (barrée dans l'UI)
        - Ne peut pas annuler une transaction REALIZED (passée)
        
        Args:
            transaction_id: ID de la transaction
            household_id: ID du foyer
            reason: Raison de l'annulation (optionnel, stocké dans notes)
            
        Returns:
            Transaction annulée
            
        Raises:
            ValueError: Si transaction REALIZED ou non trouvée
        """
        transaction = await self.get_transaction(transaction_id, household_id)
        
        if not transaction:
            raise ValueError(f"Transaction {transaction_id} introuvable")
        
        # Ne peut pas annuler une transaction réalisée
        if transaction.state == TransactionState.REALIZED:
            raise ValueError(
                "Une transaction réalisée ne peut pas être annulée. "
                "Utilisez la suppression définitive si nécessaire."
            )
        
        # Passer à CANCELLED
        transaction.state = TransactionState.CANCELLED
        
        # Ajouter la raison dans notes si fournie
        if reason:
            transaction.notes = reason
        
        transaction.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(transaction)
        
        return transaction

