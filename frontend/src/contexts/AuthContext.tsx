import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthState } from '@/types'
import { authService } from '@/services/auth'
import toast from 'react-hot-toast'

interface AuthContextType extends AuthState {
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  register: (username: string, email: string, password: string, fullName: string) => Promise<void>
  refreshAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  })

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth()
  }, [])

  // Auto-refresh token when it's about to expire
  useEffect(() => {
    if (authState.isAuthenticated) {
      const interval = setInterval(checkTokenExpiration, 9000000) // Check every minute
      return () => clearInterval(interval)
    }
  }, [authState.isAuthenticated])

  const initializeAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const token = authService.getAccessToken()
      if (!token) {
        setAuthState(prev => ({ ...prev, isLoading: false }))
        return
      }

      if (authService.isTokenExpired(token)) {
        await handleTokenRefresh()
        return
      }

      const user = authService.getUser()
      if (user) {
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      } else {
        // Try to fetch user data
        const currentUser = await authService.getCurrentUser()
        authService.setUser(currentUser)
        setAuthState({
          user: currentUser,
          isAuthenticated: true,
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      await logout()
    }
  }

  const checkTokenExpiration = async () => {
    const token = authService.getAccessToken()
    if (token && authService.isTokenExpired(token)) {
      await handleTokenRefresh()
    }
  }

  const handleTokenRefresh = async () => {
    try {
      await authService.refreshToken()
      const user = authService.getUser()
      if (user) {
        setAuthState(prev => ({
          ...prev,
          user,
          isAuthenticated: true,
          error: null
        }))
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      await logout()
    }
  }

  const login = async (username: string, password: string, rememberMe: boolean = false) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await authService.login({
        username,
        password,
        remember_me: rememberMe
      })

      setAuthState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      })

      toast.success(`Bem-vindo, ${response.user.full_name || response.user.username}!`)
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao fazer login'
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      toast.error(errorMessage)
      throw error
    }
  }

  const register = async (username: string, email: string, password: string, fullName: string) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

      const user = await authService.register({
        username,
        email,
        password,
        full_name: fullName
      })

      setAuthState(prev => ({ ...prev, isLoading: false, error: null }))
      toast.success('Conta criada com sucesso! Faça login para continuar.')
    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao criar conta'
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }))
      toast.error(errorMessage)
      throw error
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
      toast.success('Logout realizado com sucesso')
    } catch (error) {
      console.error('Logout error:', error)
      // Force logout even if API call fails
      authService.clearAuthData()
      setAuthState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      })
    }
  }

  const refreshAuth = async () => {
    await initializeAuth()
  }

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    register,
    refreshAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}