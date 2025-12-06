import React, { useEffect, useState } from 'react';
import { recurringTemplateService } from '../services/recurringTemplateService';
import { accountService } from '../services/accountService';
import { categoryService } from '../services/categoryService';
import { 
  RecurringTemplate, 
  RecurringTemplateCreate, 
  Frequency,
  FrequencyLabels,
  WeekDays,
  formatRecurrence,
  TransactionType
} from '../types/recurringTemplate';
import { Account } from '../types/account';
import { Category } from '../types/category';
import '../styles/Recurring.css';

const RecurringPage: React.FC = () => {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<RecurringTemplateCreate>({
    name: '',
    amount: 0,
    type: TransactionType.EXPENSE,
    description: '',
    frequency: Frequency.MONTHLY,
    start_date: new Date().toISOString().split('T')[0],
    account_id: '',
    day_of_month: 1
  });

  useEffect(() => {
    loadData();
  }, [showInactive]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [templatesData, accountsData, categoriesData] = await Promise.all([
        recurringTemplateService.getAll(showInactive),
        accountService.getAccounts(false),
        categoryService.getCategories()
      ]);
      setTemplates(templatesData);
      setAccounts(accountsData);
      setCategories(categoriesData);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: RecurringTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        amount: template.amount,
        type: template.type,
        description: template.description || '',
        frequency: template.frequency,
        start_date: template.start_date,
        end_date: template.end_date,
        day_of_month: template.day_of_month,
        day_of_week: template.day_of_week,
        custom_days: template.custom_days,
        account_id: template.account_id,
        destination_account_id: template.destination_account_id,
        category_id: template.category_id
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        amount: 0,
        type: TransactionType.EXPENSE,
        description: '',
        frequency: Frequency.MONTHLY,
        start_date: new Date().toISOString().split('T')[0],
        account_id: accounts[0]?.id || '',
        day_of_month: 1
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await recurringTemplateService.update(editingTemplate.id, {
          name: formData.name,
          amount: formData.amount,
          description: formData.description,
          end_date: formData.end_date,
          day_of_month: formData.day_of_month,
          day_of_week: formData.day_of_week,
          custom_days: formData.custom_days,
          category_id: formData.category_id
        });
      } else {
        await recurringTemplateService.create(formData);
      }
      handleCloseModal();
      loadData();
    } catch (err: any) {
      // Extraire le message d'erreur de la réponse API
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          setError(err.response.data.detail.map((e: any) => e.msg).join(', '));
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError(err.message || 'Erreur lors de la sauvegarde');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette récurrence ?')) {
      return;
    }
    try {
      await recurringTemplateService.delete(id);
      loadData();
    } catch (err) {
      setError('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (template: RecurringTemplate) => {
    try {
      const newStatus = template.is_active === "true" ? "false" : "true";
      await recurringTemplateService.update(template.id, { is_active: newStatus });
      loadData();
    } catch (err) {
      setError('Erreur lors de la mise à jour');
    }
  };

  const getAccountName = (accountId: string) => {
    return accounts.find(a => a.id === accountId)?.name || 'Inconnu';
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Sans catégorie';
    return categories.find(c => c.id === categoryId)?.name || 'Inconnu';
  };

  const formatAmount = (amount: number, type: TransactionType) => {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
    
    if (type === TransactionType.EXPENSE) {
      return `- ${formatted}`;
    } else if (type === TransactionType.INCOME) {
      return `+ ${formatted}`;
    }
    return formatted;
  };

  if (loading) {
    return <div className="loading">Chargement...</div>;
  }

  return (
    <div className="recurring-page">
      <div className="header">
        <h1>Récurrences</h1>
        <div className="header-actions">
          <label className="toggle-inactive">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Afficher les inactives
          </label>
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Nouvelle récurrence
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="templates-list">
        {templates.length === 0 ? (
          <div className="empty-state">
            <p>Aucune récurrence configurée</p>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
              Créer ma première récurrence
            </button>
          </div>
        ) : (
          templates.map(template => (
            <div 
              key={template.id} 
              className={`template-card ${template.is_active === "false" ? 'inactive' : ''}`}
            >
              <div className="template-header">
                <h3>{template.name}</h3>
                <span className={`amount ${template.type.toLowerCase()}`}>
                  {formatAmount(template.amount, template.type)}
                </span>
              </div>

              <div className="template-details">
                <div className="detail-row">
                  <span className="label">Fréquence :</span>
                  <span className="value">{formatRecurrence(template)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Compte :</span>
                  <span className="value">{getAccountName(template.account_id)}</span>
                </div>
                {template.category_id && (
                  <div className="detail-row">
                    <span className="label">Catégorie :</span>
                    <span className="value">{getCategoryName(template.category_id)}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Début :</span>
                  <span className="value">
                    {new Date(template.start_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {template.end_date && (
                  <div className="detail-row">
                    <span className="label">Fin :</span>
                    <span className="value">
                      {new Date(template.end_date).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                {template.description && (
                  <div className="detail-row">
                    <span className="label">Description :</span>
                    <span className="value">{template.description}</span>
                  </div>
                )}
              </div>

              <div className="template-actions">
                {template.is_active === "true" ? (
                  <>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleOpenModal(template)}
                    >
                      Modifier
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleToggleActive(template)}
                    >
                      Désactiver
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleDelete(template.id)}
                    >
                      Supprimer
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleToggleActive(template)}
                  >
                    Réactiver
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTemplate ? 'Modifier la récurrence' : 'Nouvelle récurrence'}</h2>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                    disabled={!!editingTemplate}
                    required
                  >
                    <option value={TransactionType.INCOME}>Revenu</option>
                    <option value={TransactionType.EXPENSE}>Dépense</option>
                    <option value={TransactionType.TRANSFER}>Virement</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Montant *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fréquence *</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value as Frequency })}
                  disabled={!!editingTemplate}
                  required
                >
                  {Object.entries(FrequencyLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {formData.frequency === Frequency.WEEKLY && (
                <div className="form-group">
                  <label>Jour de la semaine *</label>
                  <select
                    value={formData.day_of_week ?? 0}
                    onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
                    required
                  >
                    {WeekDays.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {[Frequency.MONTHLY, Frequency.QUARTERLY, Frequency.YEARLY].includes(formData.frequency) && (
                <div className="form-group">
                  <label>Jour du mois *</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.day_of_month ?? 1}
                    onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) })}
                    required
                  />
                </div>
              )}

              {formData.frequency === Frequency.CUSTOM && (
                <div className="form-group">
                  <label>Tous les X jours *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.custom_days ?? 1}
                    onChange={(e) => setFormData({ ...formData, custom_days: parseInt(e.target.value) })}
                    required
                  />
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Date de début *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    disabled={!!editingTemplate}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date de fin</label>
                  <input
                    type="date"
                    value={formData.end_date || ''}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Compte *</label>
                <select
                  value={formData.account_id}
                  onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                  disabled={!!editingTemplate}
                  required
                >
                  <option value="">Sélectionner un compte</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Catégorie</label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value || null })}
                >
                  <option value="">Sans catégorie</option>
                  {categories
                    .filter(c => c.type.toString() === formData.type.toString())
                    .map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTemplate ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringPage;
