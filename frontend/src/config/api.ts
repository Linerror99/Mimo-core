/**
 * Centralized API configuration for Mimo Frontend
 */
export const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_V1_URL: string = `${API_BASE_URL}/api/v1`;
