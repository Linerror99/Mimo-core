/**
 * API Client for Frontend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// Response interceptor - Handle token refresh
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

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
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
