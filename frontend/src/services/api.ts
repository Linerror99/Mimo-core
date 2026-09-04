/**
 * API Client for Frontend
 */

import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import logger from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Retry configuration
 */
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Check if error is retryable (network errors, 5xx, 429)
 */
function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    // Network error (no response from server)
    return true;
  }
  
  const status = error.response.status;
  // Retry on server errors (5xx) and rate limiting (429)
  return status >= 500 || status === 429;
}

/**
 * Delay function for retry backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for axios requests
 */
async function axiosRetry<T>(
  requestFn: () => Promise<T>,
  config: AxiosRequestConfig = {},
  attempt = 1
): Promise<T> {
  try {
    return await requestFn();
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // Don't retry if max attempts reached or error is not retryable
    if (attempt >= MAX_RETRY_ATTEMPTS || !isRetryableError(axiosError)) {
      logger.error(`Request failed after ${attempt} attempt(s)`, error);
      throw error;
    }
    
    // Exponential backoff: 1s, 2s, 4s
    const delayTime = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
    
    logger.warn(`Request failed (attempt ${attempt}/${MAX_RETRY_ATTEMPTS}). Retrying in ${delayTime}ms...`, {
      url: config.url,
      status: axiosError.response?.status,
    });
    
    await delay(delayTime);
    return axiosRetry(requestFn, config, attempt + 1);
  }
}

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh and retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          // Synchroniser également Zustand authStore
          try {
            const { useAuthStore } = await import('@/stores/authStore');
            useAuthStore.setState({ accessToken: access_token });
          } catch (_) {}

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        logger.error('Token refresh failed', refreshError);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Retry logic for network errors and 5xx
    if (isRetryableError(error as AxiosError) && !originalRequest._retryCount) {
      originalRequest._retryCount = 1;
      return axiosRetry(() => apiClient(originalRequest), originalRequest, 1);
    }

    return Promise.reject(error);
  }
);

// API methods
export const api = {
  // Health check
  healthCheck: () => apiClient.get('/health'),
  detailedHealthCheck: () => apiClient.get('/health/detailed'),

  // Auth (to be implemented in Sprint 1)
  // register: (data) => apiClient.post('/api/v1/auth/register', data),
  // login: (data) => apiClient.post('/api/v1/auth/login', data),
  // logout: () => apiClient.post('/api/v1/auth/logout'),
  // refreshToken: (refreshToken) => apiClient.post('/api/v1/auth/refresh', { refresh_token: refreshToken }),

  // Users (to be implemented in Sprint 1)
  // getMe: () => apiClient.get('/api/v1/users/me'),
  // updateProfile: (data) => apiClient.patch('/api/v1/users/me', data),

  // More endpoints to be added in future sprints...
};

export default apiClient;
