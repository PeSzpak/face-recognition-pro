import { apiService } from './api';
import { 
  User, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse 
} from '@/types';
import { API_ENDPOINTS, STORAGE_KEYS } from '@/utils/constants';

class AuthService {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await apiService.post<AuthResponse>(
      API_ENDPOINTS.LOGIN,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    // Store token
    if (response.access_token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
    }

    return response;
  }

  // Register new user
  async register(userData: RegisterData): Promise<User> {
    const response = await apiService.post<User>(
      API_ENDPOINTS.REGISTER,
      userData
    );

    return response;
  }

  // Get current user info
  async getCurrentUser(): Promise<User> {
    const response = await apiService.get<User>(API_ENDPOINTS.ME);
    
    // Store user data
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response));
    
    return response;
  }

  // Refresh token
  async refreshToken(): Promise<AuthResponse> {
    const response = await apiService.post<AuthResponse>(API_ENDPOINTS.REFRESH);
    
    if (response.access_token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.access_token);
    }

    return response;
  }

  // Logout user
  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Redirect to login page
    window.location.href = '/login';
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    return !!token;
  }

  // Get stored user data
  getStoredUser(): User | null {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }
}

export const authService = new AuthService();