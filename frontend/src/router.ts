import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/Login.vue'),
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      component: () => import('./views/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('./views/Dashboard.vue')
        },
        {
          path: 'pages',
          name: 'pages',
          component: () => import('./views/Pages.vue')
        },
        {
          path: 'pages/create',
          name: 'page-create',
          component: () => import('./views/PageEdit.vue')
        },
        {
          path: 'pages/:id/edit',
          name: 'page-edit',
          component: () => import('./views/PageEdit.vue')
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('./views/Users.vue')
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('./views/Roles.vue')
        },
        {
          path: 'profile',
          name: 'profile',
          component: () => import('./views/Profile.vue')
        }
      ]
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 嘗試從 localStorage 恢復登入狀態
  if (!authStore.isLoggedIn && localStorage.getItem('token')) {
    await authStore.fetchUser()
  }

  if (to.meta.requiresAuth !== false && !authStore.isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.name === 'login' && authStore.isLoggedIn) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router
