import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // If a token exists we must load the user before deciding what to render
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'))

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const signIn = (token, nextUser) => {
    localStorage.setItem('token', token)
    setUser(nextUser)
  }

  const signOut = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, setUser, loading, signIn, signOut }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
