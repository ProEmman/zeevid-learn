/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react'
import { API_URL } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('zeevid_token')
    const savedUser = localStorage.getItem('zeevid_user')

    if (savedToken && savedUser) {
      try {
        JSON.parse(savedUser)
        return savedToken
      } catch {
        localStorage.removeItem('zeevid_token')
        localStorage.removeItem('zeevid_user')
      }
    }

    return null
  })

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('zeevid_user')
    if (!savedUser) return null

    try {
      return JSON.parse(savedUser)
    } catch {
      localStorage.removeItem('zeevid_token')
      localStorage.removeItem('zeevid_user')
      return null
    }
  })

  const loading = false

  const login = async (identifier, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('zeevid_token', data.token)
    localStorage.setItem('zeevid_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (formData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Registration failed')
    return data
  }

  const logout = () => {
    localStorage.removeItem('zeevid_token')
    localStorage.removeItem('zeevid_user')
    setToken(null)
    setUser(null)
  }

  const refreshUser = () => {
    const savedUser = localStorage.getItem('zeevid_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        // ignore
      }
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
