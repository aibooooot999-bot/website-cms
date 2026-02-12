import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: string
  username: string
  display_name: string
  email: string
  avatar?: string
  role: {
    id: string
    name: string
    display_name: string
  }
  permissions: string[]
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // 設置 axios 預設 header
  if (token.value) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
  }

  async function login(username: string, password: string) {
    const { data } = await axios.post('/api/auth/login', { username, password })
    if (data.success) {
      token.value = data.data.token
      user.value = data.data.user
      localStorage.setItem('token', data.data.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${data.data.token}`
    }
    return data
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`
      const { data } = await axios.get('/api/auth/me')
      if (data.success) {
        user.value = data.data
      }
    } catch (e) {
      logout()
    }
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  function hasPermission(permission: string): boolean {
    if (!user.value) return false
    const perms = user.value.permissions
    if (perms.includes('*')) return true
    if (perms.includes(permission)) return true
    const [category] = permission.split('.')
    if (perms.includes(`${category}.*`)) return true
    return false
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => hasPermission(p))
  }

  return {
    user,
    token,
    isLoggedIn,
    login,
    logout,
    fetchUser,
    hasPermission,
    hasAnyPermission
  }
})
