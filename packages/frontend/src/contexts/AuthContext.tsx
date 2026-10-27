import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from '../lib/api'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
  refreshUser: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  displayName: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      if (response.data.success) {
        setUser(response.data.data)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    if (response.data.success) {
      setUser(response.data.data.user)
    } else {
      throw new Error(response.data.error?.message || 'Login failed')
    }
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  const register = async (data: RegisterData) => {
    const response = await api.post('/auth/register', data)
    if (!response.data.success) {
      throw new Error(response.data.error?.message || 'Registration failed')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loading: isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export { AuthContext }
