"""
Open Banking API Router (Enable Banking DSP2 / Mock)

Endpoints:
- GET  /api/v1/banking/institutions
- POST /api/v1/banking/connect
- POST /api/v1/banking/callback
- POST /api/v1/banking/connections/{connection_id}/link-accounts
- GET  /api/v1/banking/connections
- DELETE /api/v1/banking/connections/{connection_id}
- POST /api/v1/banking/sync                      (synchro manuelle de tout le foyer)
- POST /api/v1/banking/connections/{id}/sync     (synchro manuelle d'une connexion)
- POST /api/v1/banking/cron-sync                 (Cloud Scheduler toutes les 6h)
- POST /api/v1/banking/transactions/{tx_id}/merge   (fusionner une tx importée dans une tx prévue)
- POST /api/v1/banking/transactions/{tx_id}/unlink  (délier une tx de la banque)
"""
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.banking import (
    BankCallbackRequest,
    BankCallbackResponse,
    BankConnectRequest,
    BankConnectResponse,
    BankConnectionResponse,
    BankInstitutionResponse,
    LinkAccountsRequest,
    MergeTransactionRequest,
    MergeTransactionResponse,
    SyncSummaryResponse,
    UnlinkTransactionResponse,
)
from app.services.banking.sync_service import BankingSyncService

router = APIRouter(prefix="/banking", tags=["Open Banking"])


@router.get("/institutions", response_model=List[BankInstitutionResponse])
async def list_bank_institutions(
    country: str = Query(default="FR", min_length=2, max_length=4),
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste les établissements bancaires supportés pour un pays (défaut FR)."""
    _ = current_user
    service = BankingSyncService(db)
    institutions = await service.list_institutions(country=country, search=search)
    return [
        BankInstitutionResponse(
            name=i.name, country=i.country, logo=i.logo, bic=i.bic
        )
        for i in institutions
    ]


@router.post("/connect", response_model=BankConnectResponse, status_code=status.HTTP_201_CREATED)
async def connect_bank(
    payload: BankConnectRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Démarre le flux d'authentification bancaire DSP2 et retourne l'URL de redirection."""
    service = BankingSyncService(db)
    return await service.start_connection(
        household_id=current_user.household_id,
        user_id=current_user.id,
        payload=payload,
    )


@router.post("/callback", response_model=BankCallbackResponse)
async def banking_callback(
    payload: BankCallbackRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Échange le code OAuth/DSP2 contre une session et retourne les comptes découverts."""
    service = BankingSyncService(db)
    return await service.complete_callback(
        household_id=current_user.household_id,
        code=payload.code,
        state=payload.state,
    )


@router.post("/connections/{connection_id}/link-accounts", response_model=SyncSummaryResponse)
async def link_bank_accounts(
    connection_id: str,
    payload: LinkAccountsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Associe les comptes bancaires découverts aux comptes Mimo (existants ou nouveaux)."""
    service = BankingSyncService(db)
    return await service.link_accounts(
        household_id=current_user.household_id,
        user_id=current_user.id,
        connection_id=connection_id,
        mappings=payload.mappings,
        run_initial_sync=payload.run_initial_sync,
    )


@router.get("/connections", response_model=List[BankConnectionResponse])
async def list_bank_connections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Liste toutes les connexions bancaires du foyer avec leur statut et comptes liés."""
    service = BankingSyncService(db)
    return await service.list_connections(household_id=current_user.household_id)


@router.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bank_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Révoque une connexion bancaire (conserve les comptes et l'historique des opérations)."""
    service = BankingSyncService(db)
    await service.revoke_connection(
        household_id=current_user.household_id,
        connection_id=connection_id,
    )
    return None


@router.post("/sync", response_model=SyncSummaryResponse)
async def sync_household_banks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Déclenche manuellement la synchronisation de toutes les banques actives du foyer."""
    service = BankingSyncService(db)
    return await service.sync_household(household_id=current_user.household_id)


@router.post("/connections/{connection_id}/sync", response_model=SyncSummaryResponse)
async def sync_single_bank_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Déclenche manuellement la synchronisation d'une connexion bancaire précise."""
    service = BankingSyncService(db)
    return await service.sync_connection(
        household_id=current_user.household_id,
        connection_id=connection_id,
    )


@router.post("/cron-sync", response_model=SyncSummaryResponse)
async def cron_sync_all_banks(
    x_cron_secret: Optional[str] = Header(default=None, alias="X-Cron-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Endpoint protégé pour Cloud Scheduler (synchronisation automatique toutes les 6h)."""
    expected = settings.CRON_SYNC_SECRET or settings.JOB_TOKEN
    if not expected or x_cron_secret != expected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Secret cron invalide ou non configuré.",
        )
    service = BankingSyncService(db)
    return await service.sync_all_active_connections()


@router.post(
    "/transactions/{imported_tx_id}/merge",
    response_model=MergeTransactionResponse,
)
async def merge_imported_transaction(
    imported_tx_id: str,
    payload: MergeTransactionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Relie une opération importée de la banque à une opération Mimo déjà prévue :
    met à jour le montant (celui de la banque), la date et passe en REALIZED, puis supprime le doublon.
    """
    service = BankingSyncService(db)
    return await service.merge_imported_transaction(
        household_id=current_user.household_id,
        imported_tx_id=imported_tx_id,
        target_tx_id=payload.target_transaction_id,
    )


@router.post(
    "/transactions/{tx_id}/unlink",
    response_model=UnlinkTransactionResponse,
)
async def unlink_bank_transaction(
    tx_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Détache une transaction de sa liaison Open Banking."""
    service = BankingSyncService(db)
    return await service.unlink_bank_transaction(
        household_id=current_user.household_id,
        tx_id=tx_id,
    )
