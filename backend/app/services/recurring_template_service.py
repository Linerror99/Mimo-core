"""
Recurring Template Service

Service pour gérer les templates de transactions récurrentes.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from typing import List, Optional, Dict, Any
from datetime import date

from app.models import RecurringTemplate, Frequency


class RecurringTemplateService:
    """Service pour gérer les templates récurrents"""

    @staticmethod
    async def create_template(
        db: AsyncSession,
        household_id: str,
        data: Dict[str, Any]
    ) -> RecurringTemplate:
        """
        Créer un template récurrent
        
        Args:
            db: Session database
            household_id: ID du household
            data: Données du template
            
        Returns:
            RecurringTemplate créé
        """
        # Convertir frequency string en enum si nécessaire
        if "frequency" in data and isinstance(data["frequency"], str):
            data["frequency"] = Frequency[data["frequency"]]
        
        template = RecurringTemplate(
            household_id=household_id,
            **data
        )
        
        db.add(template)
        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def get_template(
        db: AsyncSession,
        template_id: str,
        household_id: str
    ) -> Optional[RecurringTemplate]:
        """
        Récupérer un template par ID (avec isolation household)
        
        Args:
            db: Session database
            template_id: ID du template
            household_id: ID du household (isolation)
            
        Returns:
            RecurringTemplate ou None
        """
        result = await db.execute(
            select(RecurringTemplate)
            .where(
                RecurringTemplate.id == template_id,
                RecurringTemplate.household_id == household_id
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_templates(
        db: AsyncSession,
        household_id: str,
        include_inactive: bool = True
    ) -> List[RecurringTemplate]:
        """
        Récupérer tous les templates d'un household
        
        Args:
            db: Session database
            household_id: ID du household
            include_inactive: Inclure templates inactifs (default: True)
            
        Returns:
            Liste de RecurringTemplate
        """
        query = select(RecurringTemplate).where(
            RecurringTemplate.household_id == household_id
        )
        
        if not include_inactive:
            query = query.where(RecurringTemplate.is_active == "true")
        
        query = query.order_by(RecurringTemplate.created_at.desc())
        
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_template(
        db: AsyncSession,
        template_id: str,
        household_id: str,
        data: Dict[str, Any]
    ) -> RecurringTemplate:
        """
        Mettre à jour un template
        
        Args:
            db: Session database
            template_id: ID du template
            household_id: ID du household (isolation)
            data: Nouvelles données
            
        Returns:
            RecurringTemplate mis à jour
        """
        template = await RecurringTemplateService.get_template(
            db=db, template_id=template_id, household_id=household_id
        )
        
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        # Mettre à jour les champs fournis
        for key, value in data.items():
            if hasattr(template, key):
                setattr(template, key, value)
        
        await db.commit()
        await db.refresh(template)
        return template

    @staticmethod
    async def delete_template(
        db: AsyncSession,
        template_id: str,
        household_id: str
    ) -> None:
        """
        Supprimer un template (hard delete)
        
        Args:
            db: Session database
            template_id: ID du template
            household_id: ID du household (isolation)
        """
        template = await RecurringTemplateService.get_template(
            db=db, template_id=template_id, household_id=household_id
        )
        
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        await db.delete(template)
        await db.commit()
