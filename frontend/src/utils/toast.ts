/**
 * Toast Notification Utilities
 * 
 * Centralized toast notifications using Sonner.
 * Provides user-friendly error messages in French.
 */

import { toast as sonnerToast } from 'sonner';
import logger from './logger';

/**
 * Extract user-friendly error message from API error response
 */
function extractErrorMessage(error: unknown): string {
  // Check for API error response with user-friendly message
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string; detail?: string } } }).response;
    
    // Backend returns French UX messages in "error" field
    if (response?.data?.error) {
      return response.data.error;
    }
    
    // Fallback to "detail" field (old format or validation errors)
    if (response?.data?.detail) {
      if (typeof response.data.detail === 'string') {
        return response.data.detail;
      }
      // ValidationError returns array of objects
      if (Array.isArray(response.data.detail)) {
        return 'Les données saisies sont invalides';
      }
    }
  }
  
  // Check for network errors
  if (error && typeof error === 'object' && 'message' in error) {
    const errorMessage = (error as { message?: string }).message || '';
    
    if (errorMessage.includes('Network Error') || errorMessage.includes('ECONNREFUSED')) {
      return 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }
    
    if (errorMessage.includes('timeout')) {
      return 'La requête a pris trop de temps. Veuillez réessayer.';
    }
  }
  
  // Generic fallback
  return 'Une erreur inattendue s\'est produite';
}

/**
 * Toast notification interface
 */
export const toast = {
  /**
   * Success notification (green)
   */
  success(message: string, description?: string) {
    logger.info('Toast success:', message, description);
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Error notification (red)
   * Automatically extracts user-friendly message from API errors
   */
  error(message: string, error?: unknown) {
    const errorMessage = error ? extractErrorMessage(error) : message;
    
    logger.error('Toast error:', error);
    
    sonnerToast.error('Erreur', {
      description: errorMessage,
      duration: 5000,
    });
  },

  /**
   * Warning notification (yellow)
   */
  warning(message: string, description?: string) {
    logger.warn('Toast warning:', message, description);
    sonnerToast.warning(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Info notification (blue)
   */
  info(message: string, description?: string) {
    logger.info('Toast info:', message, description);
    sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Loading notification
   * Returns toast ID to dismiss later
   */
  loading(message: string): string | number {
    logger.info('Toast loading:', message);
    return sonnerToast.loading(message);
  },

  /**
   * Dismiss a specific toast by ID
   */
  dismiss(toastId: string | number) {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Promise-based toast
   * Shows loading, then success or error based on promise result
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ): Promise<T> {
    logger.info('Toast promise:', messages.loading);
    
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: (data) => {
        const successMessage = typeof messages.success === 'function' 
          ? messages.success(data) 
          : messages.success;
        logger.info('Toast promise success:', successMessage);
        return successMessage;
      },
      error: (error) => {
        const errorMessage = typeof messages.error === 'function'
          ? messages.error(error)
          : extractErrorMessage(error);
        logger.error('Toast promise error:', error);
        return errorMessage;
      },
    });
  },
};

export default toast;
