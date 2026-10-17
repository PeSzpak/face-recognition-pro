import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, handleUnauthorized, sessionStore } from './api'
import type { Session, User } from './types'

interface AuthState {
  user: User | null
  signIn: (session: Session) => void
  signOut: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(sessionStore.read)

  const signIn = useCallback((next: Session) => {
    sessionStore.write(next)
    setSession(next)
  }, [])

  const signOut = useCallback(() => {
    sessionStore.write(null)
    setSession(null)
    queryClient.clear()
  }, [queryClient])

  const refreshUser = useCallback(async () => {
    const current = sessionStore.read()
    if (!current) return
    signIn({ ...current, user: await api.me() })
  }, [signIn])

  useEffect(() => handleUnauthorized(signOut), [signOut])

  useEffect(() => {
    refreshUser().catch(() => {})
  }, [refreshUser])

  const value = useMemo(
    () => ({ user: session?.user ?? null, signIn, signOut, refreshUser }),
    [session, signIn, signOut, refreshUser],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
