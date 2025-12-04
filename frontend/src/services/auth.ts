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
    // FastAPI OAuth2 usa form-data, não JSON
    const formData = new URLSearchParams()
    formData.append('username', credentials.username)
    formData.append('password', credentials.password)
    
    const response = await apiService.post(API_ENDPOINTS.AUTH.LOGIN, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
    
    if (response.data.access_token) {
      this.setTokens(response.data.access_token, response.data.refresh_token)
      
      // Buscar dados do usuário após login
      try {
        const userResponse = await apiService.get(API_ENDPOINTS.AUTH.ME)
        this.setUser(userResponse.data)
      } catch (error) {
        console.warn('Failed to fetch user data:', error)
      }
    }
    
    return response.data
  }

  // Register
  async register(userData: RegisterRequest): Promise<User> {
    const response = await apiService.post(API_ENDPOINTS.AUTH.REGISTER, userData)
    return response.data.user
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
    const response = await apiService.get(API_ENDPOINTS.AUTH.ME)
    return response.data
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