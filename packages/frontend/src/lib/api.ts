import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If backend returned a structured error message, propagate it to error.message
    if (error.response?.data?.error?.message) {
      error.message = error.response.data.error.message
    }

    if (error.response?.status === 401) {
      const url = error.config?.url || ''
      // Never trigger full-page redirect during login attempts or auth checks
      const isAuthAction =
        url.includes('/auth/login') ||
        url.includes('/auth/authority') ||
        url.includes('/auth/register') ||
        url.includes('/auth/google') ||
        url.includes('/auth/me')

      if (!isAuthAction) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
