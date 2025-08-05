import apiService from './api'
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  PasswordResetRequest,
  PasswordResetConfirm,
  User,
  SessionInfo
} from '@/types'
import { STORAGE_KEYS, API_ENDPOINTS } from '@/utils/constants'

class AuthService {
  // Login
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, credentials)
      
      if (response.data.access_token) {
        this.setTokens(response.data.access_token, response.data.refresh_token)
        this.setUser(response.data.user)
      }
      
      return response.data
    } catch (error: any) {
      // Se backend não estiver disponível, usar mock para demonstração
      if (error.code === 'ERR_NETWORK') {
        return this.mockLogin(credentials)
      }
      throw error
    }
  }

  // Mock login para demonstração
  private mockLogin(credentials: LoginRequest): LoginResponse {
    if (credentials.username === 'admin' && credentials.password === 'admin123') {
      const mockResponse = {
        access_token: 'mock-jwt-token-' + Date.now(),
        refresh_token: 'mock-refresh-token-' + Date.now(),
        token_type: 'Bearer',
        expires_in: 3600,
        user: {
          id: '1',
          username: credentials.username,
          email: 'admin@facerecognition.com',
          full_name: 'Administrador',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
      
      this.setTokens(mockResponse.access_token, mockResponse.refresh_token)
      this.setUser(mockResponse.user)
      
      return mockResponse
    } else {
      throw new Error('Credenciais inválidas')
    }
  }

  // Register
  async register(userData: RegisterRequest): Promise<User> {
    try {
      const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, userData)
      return response.data.user
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        // Mock register
        return {
          id: Date.now().toString(),
          username: userData.username,
          email: userData.email,
          full_name: userData.full_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
      throw error
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiService.post(API_ENDPOINTS.AUTH.LOGOUT)
    } catch (error) {
      console.warn('Erro ao fazer logout no servidor:', error)
    } finally {
      this.clearAuthData()
    }
  }

  // Refresh Token
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await apiService.post(API_ENDPOINTS.AUTH.REFRESH, {
        refresh_token: refreshToken
      })
      
      this.setTokens(response.data.access_token, response.data.refresh_token)
      return response.data.access_token
    } catch (error) {
      this.clearAuthData()
      throw error
    }
  }

  // Get current user
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiService.get(API_ENDPOINTS.AUTH.ME)
      return response.data
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        // Mock current user
        const stored = localStorage.getItem(STORAGE_KEYS.USER_DATA)
        if (stored) {
          return JSON.parse(stored)
        }
      }
      throw error
    }
  }

  // Password Reset
  async requestPasswordReset(data: PasswordResetRequest): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.PASSWORD_RESET, data)
  }

  async confirmPasswordReset(data: PasswordResetConfirm): Promise<void> {
    await apiService.post(API_ENDPOINTS.AUTH.PASSWORD_RESET_CONFIRM, data)
  }

  // Session Management
  async getSessions(): Promise<SessionInfo[]> {
    try {
      const response = await apiService.get(API_ENDPOINTS.AUTH.SESSIONS)
      return response.data.sessions
    } catch (error) {
      return []
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    await apiService.delete(`${API_ENDPOINTS.AUTH.SESSIONS}/${sessionId}`)
  }

  // Token Management
  setTokens(accessToken: string, refreshToken?: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken)
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    }
  }

  getAccessToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
  }

  setUser(user: User): void {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user))
  }

  getUser(): User | null {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA)
    return userData ? JSON.parse(userData) : null
  }

  clearAuthData(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_DATA)
  }

  // Token validation
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return payload.exp * 1000 < Date.now()
    } catch {
      return true
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken()
    return token !== null && !this.isTokenExpired(token)
  }
}

export const authService = new AuthService()