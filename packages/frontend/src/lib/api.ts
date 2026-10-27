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
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized (but not for /me endpoint)
      if (!error.config?.url?.includes('/auth/me')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
