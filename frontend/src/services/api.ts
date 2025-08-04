import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG, API_ENDPOINTS, STORAGE_KEYS, MESSAGES } from '@/utils/constants';
import toast from 'react-hot-toast';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh token
      try {
        const refreshToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (refreshToken) {
          const response = await api.post(API_ENDPOINTS.REFRESH);
          const { access_token } = response.data;
          
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        error.message || 
                        MESSAGES.ERROR_GENERIC;

    // Don't show toast for certain errors
    const silentErrors = [401, 403];
    if (!silentErrors.includes(error.response?.status)) {
      toast.error(errorMessage);
    }

    return Promise.reject(error);
  }
);

// API service class
class ApiService {
  // Generic request method
  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await api(config);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  // Error handler
  private handleError(error: any) {
    if (error.response) {
      // Server responded with error status
      return {
        message: error.response.data?.detail || error.response.data?.message,
        status: error.response.status,
        code: error.response.data?.code,
      };
    } else if (error.request) {
      // Network error
      return {
        message: MESSAGES.ERROR_NETWORK,
        status: 0,
        code: 'NETWORK_ERROR',
      };
    } else {
      // Other error
      return {
        message: error.message || MESSAGES.ERROR_GENERIC,
        status: 0,
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  // GET request
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  // POST request
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  // PUT request
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  // DELETE request
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Upload file with FormData
  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
    });
  }

  // Health check
  async healthCheck(): Promise<any> {
    return this.get(API_ENDPOINTS.HEALTH);
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default api;