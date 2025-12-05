/**
 * Categories Page
 * 
 * Manage income and expense categories with tree structure
 */
import React, { useState, useEffect } from "react";
import { categoryService } from "../services/categoryService";
import {
  Category,
  CategoryCreate,
  CategoryType,
  CATEGORY_TYPE_LABELS,
  DEFAULT_CATEGORY_COLORS,
  DEFAULT_CATEGORY_ICONS,
} from "../types/category";
import "../styles/Categories.css";

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filterType, setFilterType] = useState<CategoryType | "ALL">("ALL");

  // Form state
  const [formData, setFormData] = useState<CategoryCreate>({
    name: "",
    type: CategoryType.EXPENSE,
    icon: "🏠",
    color: "#27AE60",
    parent_id: undefined,
  });

  useEffect(() => {
    loadCategories();
  }, [filterType]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const typeFilter = filterType === "ALL" ? undefined : filterType;
      const data = await categoryService.getCategories(typeFilter);
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Erreur lors du chargement des catégories"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        icon: category.icon || "🏠",
        color: category.color || "#27AE60",
        parent_id: category.parent_id || undefined,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: "",
        type: CategoryType.EXPENSE,
        icon: "🏠",
        color: "#27AE60",
        parent_id: undefined,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, formData);
      } else {
        await categoryService.createCategory(formData);
      }
      await loadCategories();
      handleCloseModal();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la sauvegarde");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette catégorie ?")) {
      return;
    }

    try {
      await categoryService.deleteCategory(id);
      await loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const getParentCategories = () => {
    return categories.filter((cat) => cat.parent_id === null);
  };

  const getSubcategories = (parentId: string) => {
    return categories.filter((cat) => cat.parent_id === parentId);
  };

  if (loading) {
    return (
      <div className="categories-page">
        <div className="loading">Chargement des catégories...</div>
      </div>
    );
  }

  const incomeCount = categories.filter((c) => c.type === CategoryType.INCOME).length;
  const expenseCount = categories.filter((c) => c.type === CategoryType.EXPENSE).length;

  return (
    <div className="categories-page">
      <div className="categories-header">
        <h1>🏷️ Mes Catégories</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Ajouter une catégorie
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="categories-summary">
        <div className="summary-card">
          <h3>📥 Revenus</h3>
          <p className="summary-count">{incomeCount}</p>
        </div>
        <div className="summary-card">
          <h3>📤 Dépenses</h3>
          <p className="summary-count">{expenseCount}</p>
        </div>
      </div>

      <div className="filter-tabs">
        <button
          className={`tab ${filterType === "ALL" ? "active" : ""}`}
          onClick={() => setFilterType("ALL")}
        >
          Toutes
        </button>
        <button
          className={`tab ${filterType === CategoryType.INCOME ? "active" : ""}`}
          onClick={() => setFilterType(CategoryType.INCOME)}
        >
          📥 Revenus
        </button>
        <button
          className={`tab ${filterType === CategoryType.EXPENSE ? "active" : ""}`}
          onClick={() => setFilterType(CategoryType.EXPENSE)}
        >
          📤 Dépenses
        </button>
      </div>

      <div className="categories-list">
        {categories.length === 0 ? (
          <div className="empty-state">
            <p>Aucune catégorie trouvée</p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              Créer votre première catégorie
            </button>
          </div>
        ) : (
          <div className="categories-tree">
            {getParentCategories().map((parent) => (
              <div key={parent.id} className="category-group">
                <div
                  className="category-card parent"
                  style={{ borderLeftColor: parent.color || "#27AE60" }}
                >
                  <div className="category-header">
                    <span className="category-icon">{parent.icon}</span>
                    <div className="category-info">
                      <h3>{parent.name}</h3>
                      <span className="category-type">
                        {CATEGORY_TYPE_LABELS[parent.type]}
                      </span>
                    </div>
                  </div>

                  <div className="category-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleOpenModal(parent)}
                    >
                      Modifier
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(parent.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                {/* Subcategories */}
                <div className="subcategories">
                  {getSubcategories(parent.id).map((sub) => (
                    <div
                      key={sub.id}
                      className="category-card subcategory"
                      style={{ borderLeftColor: sub.color || "#95A5A6" }}
                    >
                      <div className="category-header">
                        <span className="category-icon">{sub.icon}</span>
                        <div className="category-info">
                          <h4>{sub.name}</h4>
                        </div>
                      </div>

                      <div className="category-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenModal(sub)}
                        >
                          Modifier
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(sub.id)}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Nom de la catégorie *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  placeholder="Ex: Alimentation"
                />
              </div>

              <div className="form-group">
                <label htmlFor="type">Type *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as CategoryType,
                    })
                  }
                  required
                >
                  {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="icon">Icône</label>
                <div className="icon-picker">
                  {DEFAULT_CATEGORY_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      className={`icon-btn ${
                        formData.icon === icon ? "selected" : ""
                      }`}
                      onClick={() => setFormData({ ...formData, icon })}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="color">Couleur</label>
                <div className="color-picker">
                  {DEFAULT_CATEGORY_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-btn ${
                        formData.color === color ? "selected" : ""
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="parent_id">Catégorie parente (optionnel)</label>
                <select
                  id="parent_id"
                  value={formData.parent_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      parent_id: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">Aucune (catégorie racine)</option>
                  {getParentCategories()
                    .filter((cat) => cat.id !== editingCategory?.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
