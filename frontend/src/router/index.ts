import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '儀表板' }
      },
      {
        path: 'pages',
        name: 'Pages',
        component: () => import('../views/Pages.vue'),
        meta: { title: '頁面管理', permission: 'pages.view' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('../views/Users.vue'),
        meta: { title: '使用者管理', permission: 'users.view' }
      },
      {
        path: 'roles',
        name: 'Roles',
        component: () => import('../views/Roles.vue'),
        meta: { title: '角色權限', permission: 'roles.view' }
      },
      {
        path: 'activities',
        name: 'Activities',
        component: () => import('../views/Activities.vue'),
        meta: { title: '活動記錄', permission: 'logs.view' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '個人設定' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  // Check if route requires auth
  if (to.meta.requiresAuth !== false && !authStore.isAuthenticated) {
    next('/login')
    return
  }
  
  // Check permission if specified
  if (to.meta.permission && !authStore.hasPermission(to.meta.permission as string)) {
    next('/')
    return
  }
  
  // Redirect to dashboard if already logged in and trying to access login
  if (to.path === '/login' && authStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

export default router
