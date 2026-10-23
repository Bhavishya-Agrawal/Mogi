import axios from 'axios'

// In dev, Vite proxies /api to the Express server (see vite.config.js).
// In production, set VITE_API_URL to your deployed API, e.g. https://mogi-api.example.com/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Staple the JWT to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If the token expired or is invalid, clear it and send the user to sign in
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const onAuthPage = ['/login', '/register'].includes(window.location.pathname)
    if (error.response?.status === 401 && localStorage.getItem('token') && !onAuthPage) {
      localStorage.removeItem('token')
      window.location.assign('/login')
    }
    return Promise.reject(error)
  }
)

export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error.response) return 'Cannot reach the server. Check that the API is running.'
  return error.response.data?.error || error.response.data?.message || fallback
}

export default api
