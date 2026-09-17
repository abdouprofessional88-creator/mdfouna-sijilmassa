import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const { user } = await api.me()
      setUser(user)
    } catch {
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const login = async (payload) => {
    const { user } = await api.login(payload)
    setUser(user)
    return user
  }

  const register = async (payload) => {
    const { user } = await api.register(payload)
    setUser(user)
    return user
  }

  const logout = async () => {
    try { await api.logout() } finally { setUser(null) }
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
