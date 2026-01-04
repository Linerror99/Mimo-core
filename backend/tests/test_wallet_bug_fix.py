"""
Tests de régression pour le bug wallet après fusion (Sprint 6 Phase 9)

Bug corrigé:
1. Calcul incorrect: Les wallets personnels ne incluaient PAS les initial_balance après fusion
2. Tracking manquant: Pas de moyen d'identifier le propriétaire d'origine des comptes

Solution:
- Ajout du champ Account.original_owner_user_id
- merge_households() sauvegarde le propriétaire lors de la fusion
- calculate_wallets() utilise original_owner_user_id pour inclure initial_balance

Scénario de test:
- User1 a 1000€ de initial_balance
- User2 a 500€ de initial_balance
- Fusion → Household COUPLE
- Vérifier que wallet User1 inclut ses 1000€
- Vérifier que wallet User2 inclut ses 500€
"""
from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest

from app.models import (
    Account,
    AccountType,
    Household,
    HouseholdStatus,
    HouseholdType,
    Invitation,
    InvitationStatus,
    InvitationType,
    RecurrenceFrequency,
    Transaction,
    TransactionOwnerType,
    TransactionState,
    TransactionType,
    User,
)
from app.services.household_service import HouseholdService


class TestWalletBugFix:
    """Tests de régression pour le bug wallet après fusion."""

    @pytest.fixture
    async def setup_two_users(self, db_session):
        """Créer 2 households INDIVIDUAL avec comptes et balances différentes."""
        # Household 1: User1 avec 1000€
        h1 = Household(
            id="h1",
            name="User1 Household",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(h1)

        user1 = User(
            id="user1",
            household_id=h1.id,
            email="user1@test.com",
            password_hash="hashed",
            first_name="User",
            last_name="One",
        )
        db_session.add(user1)

        acc1 = Account(
            id="acc1",
            household_id=h1.id,
            name="Compte User1",
            type=AccountType.CHECKING,
            initial_balance=Decimal("1000.00"),
            original_owner_user_id=user1.id,  # Track propriétaire
        )
        db_session.add(acc1)

        # Household 2: User2 avec 500€
        h2 = Household(
            id="h2",
            name="User2 Household",
            type=HouseholdType.INDIVIDUAL,
            status=HouseholdStatus.ACTIVE,
        )
        db_session.add(h2)

        user2 = User(
            id="user2",
            household_id=h2.id,
            email="user2@test.com",
            password_hash="hashed",
            first_name="User",
            last_name="Two",
        )
        db_session.add(user2)

        acc2 = Account(
            id="acc2",
            household_id=h2.id,
            name="Compte User2",
            type=AccountType.SAVINGS,
            initial_balance=Decimal("500.00"),
            original_owner_user_id=user2.id,  # Track propriétaire
        )
        db_session.add(acc2)

        await db_session.commit()
        await db_session.refresh(h1)
        await db_session.refresh(h2)
        await db_session.refresh(user1)
        await db_session.refresh(user2)
        await db_session.refresh(acc1)
        await db_session.refresh(acc2)

        return h1, h2, user1, user2, acc1, acc2

    async def test_wallet_includes_initial_balance_after_merge(self, db_session, setup_two_users):
        """
        Test de régression: Après fusion, les wallets personnels incluent initial_balance.

        AVANT LE FIX:
        - User1 wallet = 0€ (initial_balance de 1000€ manquant!)
        - User2 wallet = 0€ (initial_balance de 500€ manquant!)
        - Total = 1500€ (correct mais wallets personnels faux)

        APRÈS LE FIX:
        - User1 wallet = 1000€ (inclut son initial_balance)
        - User2 wallet = 500€ (inclut son initial_balance)
        - Total = 1500€ (toujours correct)
        """
        h1, h2, user1, user2, acc1, acc2 = setup_two_users

        # Créer et accepter invitation pour fusionner
        invitation = Invitation(
            id="inv1",
            inviter_user_id=user1.id,
            invitee_user_id=user2.id,
            type=InvitationType.EXISTING_USER,
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db_session.add(invitation)
        await db_session.commit()

        # Fusionner les households
        service = HouseholdService(db_session)
        merged = await service.merge_households(
            household1_id=h1.id,
            household2_id=h2.id,
            new_household_name="User1 & User2",
        )

        # Vérifier que les comptes ont bien conservé leur propriétaire d'origine
        await db_session.refresh(acc1)
        await db_session.refresh(acc2)

        assert acc1.household_id == merged.id, "Compte 1 doit être migré vers nouveau household"
        assert acc2.household_id == merged.id, "Compte 2 doit être migré vers nouveau household"
        assert acc1.original_owner_user_id == user1.id, "Compte 1 doit tracker User1 comme propriétaire"
        assert acc2.original_owner_user_id == user2.id, "Compte 2 doit tracker User2 comme propriétaire"

        # Calculer les wallets
        result = await service.calculate_wallets(merged.id)

        # Total balance = 1000 + 500 = 1500€
        assert result["total_balance"] == 1500.00, "Total doit être 1500€"

        # CORRECTIF BUG: User1 wallet inclut maintenant son initial_balance
        user1_wallet = result["members"][user1.id]
        assert user1_wallet["balance"] == 1000.00, "User1 wallet doit inclure ses 1000€ de initial_balance"
        assert user1_wallet["personal_balance"] == 0.00, "User1 n'a pas de transactions personal"
        assert user1_wallet["shared_contribution"] == 0.00, "Pas de transactions shared"

        # CORRECTIF BUG: User2 wallet inclut maintenant son initial_balance
        user2_wallet = result["members"][user2.id]
        assert user2_wallet["balance"] == 500.00, "User2 wallet doit inclure ses 500€ de initial_balance"
        assert user2_wallet["personal_balance"] == 0.00, "User2 n'a pas de transactions personal"
        assert user2_wallet["shared_contribution"] == 0.00, "Pas de transactions shared"

    async def test_wallet_with_transactions_after_merge(self, db_session, setup_two_users):
        """
        Test: Wallets incluent initial_balance + transactions après fusion.

        Scénario:
        - User1: 1000€ initial + (-50€) personal = 950€
        - User2: 500€ initial + (+200€) personal = 700€
        - Shared: -100€ (split 50/50)
        - User1 final: 1000 - 50 - 50 = 900€
        - User2 final: 500 + 200 - 50 = 650€
        """
        h1, h2, user1, user2, acc1, acc2 = setup_two_users

        # Fusionner
        invitation = Invitation(
            id="inv2",
            inviter_user_id=user1.id,
            invitee_user_id=user2.id,
            type=InvitationType.EXISTING_USER,
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db_session.add(invitation)
        await db_session.commit()

        service = HouseholdService(db_session)
        merged = await service.merge_households(
            household1_id=h1.id,
            household2_id=h2.id,
            new_household_name="User1 & User2 Transactions",
        )

        # Ajouter transactions APRÈS fusion
        tx1_personal = Transaction(
            id="tx1",
            household_id=merged.id,
            account_id=acc1.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-50.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Essence User1",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user1.id,
        )
        db_session.add(tx1_personal)

        tx2_personal = Transaction(
            id="tx2",
            household_id=merged.id,
            account_id=acc2.id,
            type=TransactionType.INCOME,
            amount=Decimal("200.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Freelance User2",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.PERSONAL,
            owner_user_id=user2.id,
        )
        db_session.add(tx2_personal)

        tx_shared = Transaction(
            id="tx3",
            household_id=merged.id,
            account_id=acc1.id,
            type=TransactionType.EXPENSE,
            amount=Decimal("-100.00"),
            transaction_date=date.today(),
            state=TransactionState.REALIZED,
            description="Restaurant",
            recurrence_frequency=RecurrenceFrequency.NONE,
            owner_type=TransactionOwnerType.SHARED,
            owner_user_id=None,
        )
        db_session.add(tx_shared)

        await db_session.commit()

        # Calculer wallets
        result = await service.calculate_wallets(merged.id)

        # Total = 1000 + 500 - 50 + 200 - 100 = 1550€
        assert result["total_balance"] == 1550.00

        # User1: 1000 (initial) + (-50) (personal) + (-50) (shared/2) = 900€
        user1_wallet = result["members"][user1.id]
        assert user1_wallet["balance"] == 900.00
        assert user1_wallet["personal_balance"] == -50.00
        assert user1_wallet["shared_contribution"] == -50.00

        # User2: 500 (initial) + 200 (personal) + (-50) (shared/2) = 650€
        user2_wallet = result["members"][user2.id]
        assert user2_wallet["balance"] == 650.00
        assert user2_wallet["personal_balance"] == 200.00
        assert user2_wallet["shared_contribution"] == -50.00

        # Shared: -100€ total, -50€ per person
        assert result["shared"]["balance"] == -100.00
        assert result["shared"]["split_per_person"] == -50.00

    async def test_account_ownership_tracking_after_merge(self, db_session, setup_two_users):
        """
        Test: original_owner_user_id est correctement préservé après fusion.

        Permet:
        1. Calcul correct des wallets (ce test)
        2. Affichage "Tes comptes" vs "Ses comptes" dans UI
        3. Dissolution future: retourner les comptes au bon propriétaire
        """
        h1, h2, user1, user2, acc1, acc2 = setup_two_users

        # Fusionner
        invitation = Invitation(
            id="inv3",
            inviter_user_id=user1.id,
            invitee_user_id=user2.id,
            type=InvitationType.EXISTING_USER,
            status=InvitationStatus.PENDING,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db_session.add(invitation)
        await db_session.commit()

        service = HouseholdService(db_session)
        merged = await service.merge_households(
            household1_id=h1.id,
            household2_id=h2.id,
            new_household_name="User1 & User2 Tracking",
        )

        # Vérifier tracking du propriétaire d'origine
        await db_session.refresh(acc1)
        await db_session.refresh(acc2)

        assert acc1.original_owner_user_id == user1.id, "Compte 1 doit appartenir à User1"
        assert acc2.original_owner_user_id == user2.id, "Compte 2 doit appartenir à User2"

        # Vérifier qu'on peut requêter par propriétaire (pour UI grouping ou dissolution)
        from sqlalchemy import select

        user1_accounts = (await db_session.execute(
            select(Account).where(
                Account.household_id == merged.id,
                Account.original_owner_user_id == user1.id
            )
        )).scalars().all()

        user2_accounts = (await db_session.execute(
            select(Account).where(
                Account.household_id == merged.id,
                Account.original_owner_user_id == user2.id
            )
        )).scalars().all()

        assert len(user1_accounts) == 1, "User1 doit avoir 1 compte"
        assert len(user2_accounts) == 1, "User2 doit avoir 1 compte"
        assert user1_accounts[0].id == acc1.id
        assert user2_accounts[0].id == acc2.id
