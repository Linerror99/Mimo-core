"""
Project API Router

Endpoints pour la gestion des projets financiers, la simulation What-If
et la validation (commit) des transactions associées.
"""
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
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
)
from app.services.project_service import ProjectService

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Lister tous les projets du foyer"""
    return await ProjectService.list_projects(db, current_user.household_id)


@router.post("", response_model=ProjectDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Créer un nouveau projet financier"""
    return await ProjectService.create_project(
        db=db,
        household_id=current_user.household_id,
        user_id=current_user.id,
        project_in=project_in
    )


@router.get("/{project_id}", response_model=ProjectDetailResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Récupérer les détails d'un projet et ses dépenses prévisionnelles"""
    return await ProjectService.get_project_detail(db, project_id, current_user.household_id)


@router.put("/{project_id}", response_model=ProjectDetailResponse)
async def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modifier les métadonnées d'un projet"""
    return await ProjectService.update_project(db, project_id, current_user.household_id, project_in)


@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Supprimer un projet et ses transactions projetées associées"""
    return await ProjectService.delete_project(db, project_id, current_user.household_id)


@router.post("/{project_id}/items", response_model=ProjectItemResponse, status_code=status.HTTP_201_CREATED)
async def add_project_item(
    project_id: str,
    item_in: ProjectItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Ajouter une dépense prévisionnelle à un projet"""
    return await ProjectService.add_project_item(db, project_id, current_user.household_id, item_in)


@router.put("/{project_id}/items/{item_id}", response_model=ProjectItemResponse)
async def update_project_item(
    project_id: str,
    item_id: str,
    item_in: ProjectItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Modifier une dépense prévisionnelle d'un projet"""
    return await ProjectService.update_project_item(db, project_id, item_id, current_user.household_id, item_in)


@router.delete("/{project_id}/items/{item_id}")
async def delete_project_item(
    project_id: str,
    item_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Supprimer une dépense prévisionnelle"""
    return await ProjectService.delete_project_item(db, project_id, item_id, current_user.household_id)


@router.get("/{project_id}/simulate", response_model=ProjectSimulationResponse)
async def simulate_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Lancer la simulation What-If dédiée au projet.
    Compare la trésorerie de base avec la trésorerie impactée par les dépenses prévues.
    """
    return await ProjectService.simulate_project(db, project_id, current_user.household_id)


@router.post("/{project_id}/commit", response_model=ProjectCommitResponse)
async def commit_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Valider le projet et générer les transactions dans la timeline officielle (statut PROJECTED).
    """
    return await ProjectService.commit_project(
        db=db,
        project_id=project_id,
        household_id=current_user.household_id,
        user_id=current_user.id
    )


@router.post("/{project_id}/rollback", response_model=ProjectCommitResponse)
async def rollback_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Annuler la validation d'un projet : retire les transactions projetées futures
    et repasse le projet en statut DRAFT / simulation.
    """
    return await ProjectService.rollback_project(db, project_id, current_user.household_id)
