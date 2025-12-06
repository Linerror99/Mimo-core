/**
 * Recurring Template Service
 * 
 * Service pour gérer les templates de transactions récurrentes via l'API.
 */
import { 
  RecurringTemplate, 
  RecurringTemplateCreate, 
  RecurringTemplateUpdate,
  BulkCancelRequest,
  BulkUpdateRequest
} from '../types/recurringTemplate';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class RecurringTemplateService {
  /**
   * Récupérer tous les templates récurrents
   */
  async getAll(includeInactive: boolean = false): Promise<RecurringTemplate[]> {
    const token = localStorage.getItem('access_token');
    const url = `${API_URL}/api/v1/recurring-templates?include_inactive=${includeInactive}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recurring templates');
    }
    
    return response.json();
  }

  /**
   * Récupérer un template par ID
   */
  async getById(id: string): Promise<RecurringTemplate> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/recurring-templates/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch recurring template');
    }
    
    return response.json();
  }

  /**
   * Créer un nouveau template récurrent
   */
  async create(data: RecurringTemplateCreate): Promise<RecurringTemplate> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/recurring-templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create recurring template');
    }
    
    return response.json();
  }

  /**
   * Mettre à jour un template récurrent
   */
  async update(id: string, data: RecurringTemplateUpdate): Promise<RecurringTemplate> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/recurring-templates/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update recurring template');
    }
    
    return response.json();
  }

  /**
   * Supprimer un template récurrent
   */
  async delete(id: string): Promise<void> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/recurring-templates/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete recurring template');
    }
  }

  /**
   * Annuler des occurrences sur une période (bulk cancel)
   */
  async bulkCancel(id: string, request: BulkCancelRequest): Promise<{ deleted_count: number }> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/recurring-templates/${id}/bulk-cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to bulk cancel occurrences');
    }
    
    return response.json();
  }

  /**
   * Modifier le montant sur une période (bulk update)
   */
  async bulkUpdate(id: string, request: BulkUpdateRequest): Promise<{ updated_count: number }> {
    const token = localStorage.getItem('access_token');
    
    const response = await fetch(`${API_URL}/api/v1/recurring-templates/${id}/bulk-update`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to bulk update occurrences');
    }
    
    return response.json();
  }
}

export const recurringTemplateService = new RecurringTemplateService();
