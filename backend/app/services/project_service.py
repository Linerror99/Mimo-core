"""
Project Service

Logique métier pour la gestion des projets financiers,
la simulation What-If sans impact sur la timeline officielle,
et la validation (commit) des transactions.
"""
from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.category import Category
from app.models.project import Project, ProjectItem, ProjectStatus
from app.models.transaction import Transaction, TransactionOwnerType, TransactionState, TransactionType
from app.models.user import User
from app.schemas.project import (
    ProjectCommitResponse,
    ProjectCreate,
    ProjectDetailResponse,
    ProjectItemCreate,
    ProjectItemResponse,
    ProjectItemUpdate,
    ProjectResponse,
    ProjectSimulationResponse,
    ProjectUpdate,
    SimulationTimelinePoint,
    SimulationWarning,
)
from app.services.account_service import AccountService
from app.services.projection_service import ProjectionService


class ProjectService:
    """Service gérant les projets financiers et la simulation What-If"""

    @staticmethod
    async def list_projects(
        db: AsyncSession,
        household_id: str
    ) -> List[ProjectResponse]:
        """Lister tous les projets d'un foyer avec agrégats"""
        query = (
            select(
                Project,
                func.coalesce(func.sum(ProjectItem.amount), 0).label("total_planned_amount"),
                func.count(ProjectItem.id).label("items_count")
            )
            .outerjoin(ProjectItem, Project.id == ProjectItem.project_id)
            .where(Project.household_id == household_id)
            .group_by(Project.id)
            .order_by(Project.created_at.desc())
        )
        result = await db.execute(query)
        rows = result.all()

        projects = []
        for project, total_planned, items_count in rows:
            p_dict = {
                "id": project.id,
                "household_id": project.household_id,
                "created_by": project.created_by,
                "name": project.name,
                "description": project.description,
                "color": project.color or "#6366f1",
                "icon": project.icon or "Compass",
                "target_start_date": project.target_start_date,
                "target_end_date": project.target_end_date,
                "total_budget": project.total_budget,
                "status": project.status,
                "total_planned_amount": Decimal(str(total_planned)),
                "items_count": int(items_count),
                "created_at": project.created_at,
                "updated_at": project.updated_at,
            }
            projects.append(ProjectResponse(**p_dict))
        return projects

    @staticmethod
    async def get_project_detail(
        db: AsyncSession,
        project_id: str,
        household_id: str
    ) -> ProjectDetailResponse:
        """Récupérer les détails complets d'un projet avec ses items"""
        query = (
            select(Project)
            .options(
                selectinload(Project.items).selectinload(ProjectItem.account),
                selectinload(Project.items).selectinload(ProjectItem.category),
                selectinload(Project.items).selectinload(ProjectItem.owner_user),
            )
            .where(Project.id == project_id, Project.household_id == household_id)
        )
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projet introuvable"
            )

        items_resp = []
        total_planned = Decimal("0")
        for item in project.items:
            total_planned += Decimal(str(item.amount))
            items_resp.append(
                ProjectItemResponse(
                    id=item.id,
                    project_id=item.project_id,
                    name=item.name,
                    amount=item.amount,
                    planned_date=item.planned_date,
                    account_id=item.account_id,
                    category_id=item.category_id,
                    owner_user_id=item.owner_user_id,
                    transaction_id=item.transaction_id,
                    notes=item.notes,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                    account_name=item.account.name if item.account else None,
                    category_name=item.category.name if item.category else None,
                    owner_name=f"{item.owner_user.first_name} {item.owner_user.last_name}".strip() if item.owner_user else None,
                )
            )

        return ProjectDetailResponse(
            id=project.id,
            household_id=project.household_id,
            created_by=project.created_by,
            name=project.name,
            description=project.description,
            color=project.color or "#6366f1",
            icon=project.icon or "Compass",
            target_start_date=project.target_start_date,
            target_end_date=project.target_end_date,
            total_budget=project.total_budget,
            status=project.status,
            total_planned_amount=total_planned,
            items_count=len(project.items),
            created_at=project.created_at,
            updated_at=project.updated_at,
            items=items_resp,
        )

    @staticmethod
    async def create_project(
        db: AsyncSession,
        household_id: str,
        user_id: str,
        project_in: ProjectCreate
    ) -> ProjectDetailResponse:
        """Créer un nouveau projet avec ses dépenses prévisionnelles optionnelles"""
        project = Project(
            household_id=household_id,
            created_by=user_id,
            name=project_in.name,
            description=project_in.description,
            color=project_in.color or "#6366f1",
            icon=project_in.icon or "Compass",
            target_start_date=project_in.target_start_date,
            target_end_date=project_in.target_end_date,
            total_budget=project_in.total_budget,
            status=ProjectStatus.DRAFT,
        )
        db.add(project)
        await db.flush()

        # Ajouter les items prévus s'il y en a
        if project_in.items:
            for item_in in project_in.items:
                # Vérifier que le compte appartient au foyer
                account = await AccountService.get_account_by_id(db, item_in.account_id, household_id)
                if not account:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Le compte {item_in.account_id} n'appartient pas à ce foyer"
                    )
                item = ProjectItem(
                    project_id=project.id,
                    account_id=item_in.account_id,
                    category_id=item_in.category_id,
                    owner_user_id=item_in.owner_user_id,
                    name=item_in.name,
                    amount=item_in.amount,
                    planned_date=item_in.planned_date,
                    notes=item_in.notes,
                )
                db.add(item)

        await db.commit()
        return await ProjectService.get_project_detail(db, project.id, household_id)

    @staticmethod
    async def update_project(
        db: AsyncSession,
        project_id: str,
        household_id: str,
        project_in: ProjectUpdate
    ) -> ProjectDetailResponse:
        """Mettre à jour les informations d'un projet"""
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projet introuvable"
            )

        update_dict = project_in.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(project, field, value)

        await db.commit()
        return await ProjectService.get_project_detail(db, project.id, household_id)

    @staticmethod
    async def delete_project(
        db: AsyncSession,
        project_id: str,
        household_id: str
    ) -> dict:
        """Supprimer un projet et nettoyer ses transactions projetées non réalisées"""
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projet introuvable"
            )

        # Supprimer les transactions futures rattachées qui n'ont pas encore été réalisées
        future_tx_query = (
            select(Transaction)
            .where(
                Transaction.project_id == project_id,
                Transaction.state == TransactionState.PROJECTED
            )
        )
        tx_result = await db.execute(future_tx_query)
        for tx in tx_result.scalars().all():
            await db.delete(tx)

        await db.delete(project)
        await db.commit()
        return {"success": True, "message": "Projet supprimé avec succès"}

    @staticmethod
    async def add_project_item(
        db: AsyncSession,
        project_id: str,
        household_id: str,
        item_in: ProjectItemCreate
    ) -> ProjectItemResponse:
        """Ajouter une dépense prévisionnelle à un projet"""
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Projet introuvable"
            )

        account = await AccountService.get_account_by_id(db, item_in.account_id, household_id)
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Compte introuvable ou non autorisé"
            )

        item = ProjectItem(
            project_id=project.id,
            account_id=item_in.account_id,
            category_id=item_in.category_id,
            owner_user_id=item_in.owner_user_id,
            name=item_in.name,
            amount=item_in.amount,
            planned_date=item_in.planned_date,
            notes=item_in.notes,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)

        category_name = None
        if item.category_id:
            cat = await db.get(Category, item.category_id)
            if cat:
                category_name = cat.name

        owner_name = None
        if item.owner_user_id:
            usr = await db.get(User, item.owner_user_id)
            if usr:
                owner_name = f"{usr.first_name} {usr.last_name}".strip()

        return ProjectItemResponse(
            id=item.id,
            project_id=item.project_id,
            name=item.name,
            amount=item.amount,
            planned_date=item.planned_date,
            account_id=item.account_id,
            category_id=item.category_id,
            owner_user_id=item.owner_user_id,
            transaction_id=item.transaction_id,
            notes=item.notes,
            created_at=item.created_at,
            updated_at=item.updated_at,
            account_name=account.name,
            category_name=category_name,
            owner_name=owner_name,
        )

    @staticmethod
    async def update_project_item(
        db: AsyncSession,
        project_id: str,
        item_id: str,
        household_id: str,
        item_in: ProjectItemUpdate
    ) -> ProjectItemResponse:
        """Modifier une dépense prévisionnelle"""
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")

        item = await db.get(ProjectItem, item_id)
        if not item or item.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dépense introuvable")

        update_dict = item_in.model_dump(exclude_unset=True)
        if "account_id" in update_dict and update_dict["account_id"]:
            acc = await AccountService.get_account_by_id(db, update_dict["account_id"], household_id)
            if not acc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Compte non autorisé")

        for field, value in update_dict.items():
            setattr(item, field, value)

        # Si l'item avait déjà été validé et a une transaction projetée, on la synchronise
        if item.transaction_id:
            tx = await db.get(Transaction, item.transaction_id)
            if tx and tx.state == TransactionState.PROJECTED:
                if "amount" in update_dict:
                    tx.amount = -abs(item.amount)
                if "planned_date" in update_dict:
                    tx.transaction_date = item.planned_date
                if "name" in update_dict:
                    tx.description = f"[{project.name}] {item.name}"
                if "account_id" in update_dict:
                    tx.account_id = item.account_id
                if "category_id" in update_dict:
                    tx.category_id = item.category_id

        await db.commit()
        await db.refresh(item)

        acc = await db.get(Account, item.account_id)
        cat = await db.get(Category, item.category_id) if item.category_id else None
        usr = await db.get(User, item.owner_user_id) if item.owner_user_id else None

        return ProjectItemResponse(
            id=item.id,
            project_id=item.project_id,
            name=item.name,
            amount=item.amount,
            planned_date=item.planned_date,
            account_id=item.account_id,
            category_id=item.category_id,
            owner_user_id=item.owner_user_id,
            transaction_id=item.transaction_id,
            notes=item.notes,
            created_at=item.created_at,
            updated_at=item.updated_at,
            account_name=acc.name if acc else None,
            category_name=cat.name if cat else None,
            owner_name=f"{usr.first_name} {usr.last_name}".strip() if usr else None,
        )

    @staticmethod
    async def delete_project_item(
        db: AsyncSession,
        project_id: str,
        item_id: str,
        household_id: str
    ) -> dict:
        """Supprimer une dépense prévisionnelle"""
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")

        item = await db.get(ProjectItem, item_id)
        if not item or item.project_id != project_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dépense introuvable")

        if item.transaction_id:
            tx = await db.get(Transaction, item.transaction_id)
            if tx and tx.state == TransactionState.PROJECTED:
                await db.delete(tx)

        await db.delete(item)
        await db.commit()
        return {"success": True, "message": "Dépense supprimée avec succès"}

    @staticmethod
    async def simulate_project(
        db: AsyncSession,
        project_id: str,
        household_id: str
    ) -> ProjectSimulationResponse:
        """
        Lancer la simulation What-If dédiée au projet :
        - Calcule l'évolution baseline (sans les dépenses non validées du projet)
        - Superpose les dépenses planifiées du projet par date et compte
        - Évalue la viabilité financière et signale les découverts anticipés
        """
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")

        # 1. Récupérer les comptes actifs et leurs soldes actuels réels
        accounts = await AccountService.list_accounts(db, household_id, include_inactive=False)
        if not accounts:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucun compte actif trouvé")

        initial_account_balances: Dict[str, Decimal] = {}
        account_names: Dict[str, str] = {}
        for acc in accounts:
            account_names[acc.id] = acc.name
            bal = await AccountService.calculate_balance(db, acc.id)
            initial_account_balances[acc.id] = bal

        current_total_balance = sum(initial_account_balances.values(), Decimal("0"))

        # 2. Récupérer les items du projet
        items_query = select(ProjectItem).where(ProjectItem.project_id == project_id).order_by(ProjectItem.planned_date)
        items_result = await db.execute(items_query)
        items = list(items_result.scalars().all())

        total_cost = sum((Decimal(str(item.amount)) for item in items), Decimal("0"))

        # 3. Déterminer l'horizon de simulation
        today = date.today()
        max_item_date = max((item.planned_date for item in items), default=today)
        # Horizon minimum 90 jours ou max item date + 30 jours (limité à 365 jours)
        end_horizon = max(today + timedelta(days=90), max_item_date + timedelta(days=30))
        if end_horizon > today + timedelta(days=365):
            end_horizon = today + timedelta(days=365)

        # 4. Récupérer les transactions projetées baseline (déjà existantes dans le système)
        # Exclusion des transactions déjà générées par CE projet si on est en train de resimuler
        future_tx_query = (
            select(Transaction)
            .where(
                Transaction.household_id == household_id,
                Transaction.state == TransactionState.PROJECTED,
                Transaction.transaction_date >= today,
                Transaction.transaction_date <= end_horizon,
                Transaction.deleted_at.is_(None),
            )
            .order_by(Transaction.transaction_date)
        )
        tx_result = await db.execute(future_tx_query)
        baseline_txs = list(tx_result.scalars().all())

        # Grouper les mouvements par date
        # Map: date -> list of {account_id, amount}
        baseline_movements = defaultdict(list)
        for tx in baseline_txs:
            # Ne pas double-compter si la transaction est déjà liée à ce projet en état COMMITTED
            if tx.project_id == project_id:
                continue
            amt = Decimal(str(tx.amount))
            baseline_movements[tx.transaction_date].append({
                "account_id": tx.account_id,
                "amount": amt
            })
            if tx.destination_account_id and tx.type == TransactionType.TRANSFER:
                baseline_movements[tx.transaction_date].append({
                    "account_id": tx.destination_account_id,
                    "amount": abs(amt)
                })

        # Mouvements supplémentaires apportés par le projet (What-If)
        project_movements = defaultdict(list)
        for item in items:
            # Dépense = montant négatif
            project_movements[item.planned_date].append({
                "account_id": item.account_id,
                "amount": -Decimal(str(item.amount)),
                "name": item.name
            })

        # 5. Parcourir jour par jour ou par date d'événement clé
        all_event_dates = set(baseline_movements.keys()).union(project_movements.keys())
        all_event_dates.add(today)
        all_event_dates.add(end_horizon)

        # Ajouter un pas hebdomadaire régulier pour que le graphique soit fluide
        step_date = today
        while step_date <= end_horizon:
            all_event_dates.add(step_date)
            step_date += timedelta(days=7)

        sorted_dates = sorted(list(all_event_dates))

        running_baseline_accounts = dict(initial_account_balances)
        running_whatif_accounts = dict(initial_account_balances)

        timeline_points: List[SimulationTimelinePoint] = []
        warnings: List[SimulationWarning] = []

        min_balance_baseline = current_total_balance
        min_balance_whatif = current_total_balance
        critical_account_name = None
        critical_date = None

        last_applied_date = today - timedelta(days=1)

        for current_d in sorted_dates:
            # Appliquer les flux entre last_applied_date + 1 et current_d inclus
            scan_d = last_applied_date + timedelta(days=1)
            while scan_d <= current_d:
                # Appliquer flux baseline
                if scan_d in baseline_movements:
                    for m in baseline_movements[scan_d]:
                        acc_id = m["account_id"]
                        if acc_id in running_baseline_accounts:
                            running_baseline_accounts[acc_id] += m["amount"]
                        if acc_id in running_whatif_accounts:
                            running_whatif_accounts[acc_id] += m["amount"]

                # Appliquer flux projet sur What-If uniquement
                if scan_d in project_movements:
                    for m in project_movements[scan_d]:
                        acc_id = m["account_id"]
                        if acc_id in running_whatif_accounts:
                            running_whatif_accounts[acc_id] += m["amount"]

                            # Détecter découvert
                            if running_whatif_accounts[acc_id] < 0:
                                acc_name = account_names.get(acc_id, "Compte inconnu")
                                if not critical_account_name:
                                    critical_account_name = acc_name
                                    critical_date = scan_d

                                # Éviter les alertes dupliquées pour le même compte le même jour
                                warning_msg = (
                                    f"Le compte '{acc_name}' sera à découvert "
                                    f"({running_whatif_accounts[acc_id]:.2f} €) le {scan_d.strftime('%d/%m/%Y')} "
                                    f"suite à la dépense '{m.get('name', 'Projet')}'"
                                )
                                warnings.append(
                                    SimulationWarning(
                                        type="NEGATIVE_BALANCE",
                                        severity="CRITICAL",
                                        account_id=acc_id,
                                        account_name=acc_name,
                                        date=scan_d,
                                        balance=running_whatif_accounts[acc_id],
                                        message=warning_msg,
                                    )
                                )

                scan_d += timedelta(days=1)

            last_applied_date = current_d

            # Totaux
            base_total = sum(running_baseline_accounts.values(), Decimal("0"))
            whatif_total = sum(running_whatif_accounts.values(), Decimal("0"))

            if base_total < min_balance_baseline:
                min_balance_baseline = base_total
            if whatif_total < min_balance_whatif:
                min_balance_whatif = whatif_total

            accounts_snapshot = {}
            for acc in accounts:
                accounts_snapshot[acc.id] = {
                    "name": account_names.get(acc.id, ""),
                    "baseline": float(running_baseline_accounts.get(acc.id, Decimal("0"))),
                    "whatif": float(running_whatif_accounts.get(acc.id, Decimal("0"))),
                }

            timeline_points.append(
                SimulationTimelinePoint(
                    date=current_d.strftime("%Y-%m-%d"),
                    baseline_balance=float(base_total),
                    whatif_balance=float(whatif_total),
                    impact=float(whatif_total - base_total),
                    accounts=accounts_snapshot,
                )
            )

        is_viable = len([w for w in warnings if w.severity == "CRITICAL"]) == 0

        return ProjectSimulationResponse(
            project_id=project.id,
            project_name=project.name,
            is_viable=is_viable,
            status=project.status,
            total_cost=total_cost,
            current_balance=current_total_balance,
            projected_min_balance_baseline=min_balance_baseline,
            projected_min_balance_whatif=min_balance_whatif,
            critical_account_name=critical_account_name,
            critical_date=critical_date,
            warnings=warnings[:5],  # Top 5 warnings les plus pertinents
            timeline=timeline_points,
        )

    @staticmethod
    async def commit_project(
        db: AsyncSession,
        project_id: str,
        household_id: str,
        user_id: str
    ) -> ProjectCommitResponse:
        """
        Valider le projet et générer les transactions correspondantes dans la timeline
        """
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")

        items_query = select(ProjectItem).where(ProjectItem.project_id == project_id)
        items_result = await db.execute(items_query)
        items = list(items_result.scalars().all())

        if not items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Impossible de valider un projet sans dépenses prévues"
            )

        created_count = 0
        today = date.today()

        for item in items:
            # Si l'item n'a pas déjà généré une transaction
            if not item.transaction_id:
                # Si la date est passée ou aujourd'hui, PENDING ou REALIZED, sinon PROJECTED
                tx_state = TransactionState.PROJECTED
                if item.planned_date < today:
                    tx_state = TransactionState.REALIZED
                elif item.planned_date == today:
                    tx_state = TransactionState.PENDING

                tx = Transaction(
                    household_id=household_id,
                    account_id=item.account_id,
                    category_id=item.category_id,
                    amount=-abs(Decimal(str(item.amount))),
                    transaction_date=item.planned_date,
                    type=TransactionType.EXPENSE,
                    state=tx_state,
                    description=f"[{project.name}] {item.name}",
                    notes=item.notes,
                    project_id=project.id,
                    owner_user_id=item.owner_user_id or user_id,
                    owner_type=TransactionOwnerType.PERSONAL if item.owner_user_id else TransactionOwnerType.SHARED,
                )
                db.add(tx)
                await db.flush()
                item.transaction_id = tx.id
                created_count += 1

        project.status = ProjectStatus.COMMITTED
        await db.commit()

        return ProjectCommitResponse(
            success=True,
            project_id=project.id,
            status=project.status,
            transactions_created=created_count,
            message=f"Projet '{project.name}' validé avec succès ! {created_count} transaction(s) intégrée(s) à la timeline.",
        )

    @staticmethod
    async def rollback_project(
        db: AsyncSession,
        project_id: str,
        household_id: str
    ) -> ProjectCommitResponse:
        """
        Annuler la validation d'un projet : retire les transactions futures (PROJECTED)
        et repasse le projet en statut DRAFT pour permettre de refaire des simulations.
        """
        project = await db.get(Project, project_id)
        if not project or project.household_id != household_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Projet introuvable")

        # Supprimer les transactions projetées liées
        tx_query = select(Transaction).where(
            Transaction.project_id == project_id,
            Transaction.state == TransactionState.PROJECTED
        )
        tx_res = await db.execute(tx_query)
        cancelled_txs = list(tx_res.scalars().all())
        count = len(cancelled_txs)

        for tx in cancelled_txs:
            await db.delete(tx)

        # Reset item transaction_id
        items_query = select(ProjectItem).where(ProjectItem.project_id == project_id)
        items_res = await db.execute(items_query)
        for item in items_res.scalars().all():
            if item.transaction_id:
                # Vérifier si la transaction associée a été supprimée
                tx = await db.get(Transaction, item.transaction_id)
                if not tx or tx.state == TransactionState.PROJECTED:
                    item.transaction_id = None

        project.status = ProjectStatus.DRAFT
        await db.commit()

        return ProjectCommitResponse(
            success=True,
            project_id=project.id,
            status=project.status,
            transactions_created=count,
            message=f"Le projet '{project.name}' a été repassé en simulation. {count} transaction(s) future(s) retirée(s).",
        )
