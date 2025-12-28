"""
Category Service

Business logic for category management (CRUD + tree operations)
"""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Category, CategoryType
from app.schemas.category import CategoryCreate, CategoryUpdate


class CategoryService:
    """Service for managing categories"""

    async def create_category(
        self,
        db: AsyncSession,
        household_id: str,
        category_data: CategoryCreate
    ) -> Category:
        """Create a new category"""
        category = Category(
            household_id=household_id,
            name=category_data.name,
            type=category_data.type,
            icon=category_data.icon,
            color=category_data.color,
            parent_id=category_data.parent_id
        )

        db.add(category)
        await db.commit()
        await db.refresh(category)

        return category

    async def get_category_by_id(
        self,
        db: AsyncSession,
        category_id: str,
        household_id: str
    ) -> Optional[Category]:
        """Get a category by ID (with household isolation)"""
        result = await db.execute(
            select(Category).where(
                Category.id == category_id,
                Category.household_id == household_id
            )
        )
        return result.scalar_one_or_none()

    async def list_categories(
        self,
        db: AsyncSession,
        household_id: str,
        category_type: Optional[CategoryType] = None,
        parent_id: Optional[str] = None
    ) -> List[Category]:
        """
        List categories for a household

        Args:
            db: Database session
            household_id: Household ID to filter by
            category_type: Optional filter by INCOME or EXPENSE
            parent_id: Optional filter by parent (for subcategories)

        Returns:
            List of categories
        """
        query = select(Category).where(Category.household_id == household_id)

        if category_type is not None:
            query = query.where(Category.type == category_type)

        if parent_id is not None:
            query = query.where(Category.parent_id == parent_id)

        query = query.order_by(Category.name)

        result = await db.execute(query)
        return list(result.scalars().all())

    async def update_category(
        self,
        db: AsyncSession,
        category: Category,
        update_data: CategoryUpdate
    ) -> Category:
        """Update a category"""
        update_dict = update_data.model_dump(exclude_unset=True)

        for field, value in update_dict.items():
            setattr(category, field, value)

        await db.commit()
        await db.refresh(category)

        return category

    async def delete_category(
        self,
        db: AsyncSession,
        category: Category
    ) -> None:
        """
        Delete a category

        Note: Cascade delete will handle subcategories if configured in model
        """
        await db.delete(category)
        await db.commit()

    async def get_subcategories(
        self,
        db: AsyncSession,
        parent_id: str,
        household_id: str
    ) -> List[Category]:
        """Get all direct subcategories of a category"""
        result = await db.execute(
            select(Category).where(
                Category.parent_id == parent_id,
                Category.household_id == household_id
            ).order_by(Category.name)
        )
        return list(result.scalars().all())

    async def get_category_tree(
        self,
        db: AsyncSession,
        household_id: str,
        category_type: Optional[CategoryType] = None
    ) -> List[dict]:
        """
        Get categories organized as a tree structure

        Returns a list of root categories with their children nested
        """
        # Get all categories
        all_categories = await self.list_categories(db, household_id, category_type)

        # Build a dict for quick lookup
        category_dict = {cat.id: cat for cat in all_categories}

        # Build tree structure
        tree = []
        for category in all_categories:
            if category.parent_id is None:
                # Root category
                tree.append(self._build_category_node(category, category_dict))

        return tree

    def _build_category_node(
        self,
        category: Category,
        category_dict: dict
    ) -> dict:
        """Recursively build a category node with its children"""
        node = {
            "id": category.id,
            "name": category.name,
            "type": category.type.value,
            "icon": category.icon,
            "color": category.color,
            "parent_id": category.parent_id,
            "children": []
        }

        # Find children
        for cat_id, cat in category_dict.items():
            if cat.parent_id == category.id:
                node["children"].append(self._build_category_node(cat, category_dict))

        return node
