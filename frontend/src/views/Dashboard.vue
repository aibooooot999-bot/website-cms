<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()

interface Stats {
  totalPages: number
  publishedPages: number
  totalUsers: number
  recentActivities: number
}

interface Activity {
  id: string
  user_name: string
  action: string
  details: string
  created_at: string
}

const stats = ref<Stats | null>(null)
const activities = ref<Activity[]>([])
const loading = ref(true)

onMounted(async () => {
  const api = useApi()
  
  const [statsRes, activitiesRes] = await Promise.all([
    api.get('/api/dashboard/stats'),
    authStore.hasPermission('logs.view') 
      ? api.get('/api/dashboard/activities?limit=10')
      : Promise.resolve({ success: true, data: [] })
  ])
  
  if (statsRes.success) stats.value = statsRes.data
  if (activitiesRes.success) activities.value = activitiesRes.data || []
  
  loading.value = false
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-TW', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    'login': '登入系統',
    'logout': '登出系統',
    'user.create': '建立使用者',
    'user.update': '更新使用者',
    'user.delete': '刪除使用者',
    'page.create': '建立頁面',
    'page.update': '更新頁面',
    'page.delete': '刪除頁面',
    'role.create': '建立角色',
    'role.update': '更新角色',
  }
  return labels[action] || action
}
</script>

<template>
  <div>
    <!-- Welcome -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
        歡迎回來，{{ authStore.user?.display_name }} <i class="fas fa-hand-wave text-yellow-500 animate-wave"></i>
      </h1>
      <p class="text-gray-500 mt-1">這是您的網站管理後台概覽</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="spinner w-8 h-8 border-primary-600"></div>
    </div>

    <template v-else>
      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="stat-card flex items-center justify-between group">
          <div>
            <p class="stat-value">{{ stats?.totalPages || 0 }}</p>
            <p class="stat-label">總頁面數</p>
          </div>
          <div class="stat-icon bg-blue-100 text-blue-600">
            <i class="fas fa-file-lines"></i>
          </div>
        </div>
        
        <div class="stat-card flex items-center justify-between group">
          <div>
            <p class="stat-value">{{ stats?.publishedPages || 0 }}</p>
            <p class="stat-label">已發布</p>
          </div>
          <div class="stat-icon bg-green-100 text-green-600">
            <i class="fas fa-circle-check"></i>
          </div>
        </div>
        
        <div class="stat-card flex items-center justify-between group">
          <div>
            <p class="stat-value">{{ stats?.totalUsers || 0 }}</p>
            <p class="stat-label">使用者</p>
          </div>
          <div class="stat-icon bg-purple-100 text-purple-600">
            <i class="fas fa-users"></i>
          </div>
        </div>
        
        <div class="stat-card flex items-center justify-between group">
          <div>
            <p class="stat-value">{{ stats?.recentActivities || 0 }}</p>
            <p class="stat-label">近 7 天活動</p>
          </div>
          <div class="stat-icon bg-orange-100 text-orange-600">
            <i class="fas fa-chart-line"></i>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card mb-8">
        <div class="card-header">
          <h2 class="card-title">快速操作</h2>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <RouterLink 
              v-if="authStore.hasPermission('pages.create')"
              to="/pages/create" 
              class="quick-action-card group"
            >
              <i class="fas fa-plus text-3xl text-primary-600 group-hover:scale-110 transition-transform"></i>
              <span class="text-sm font-medium text-gray-700">新增頁面</span>
            </RouterLink>
            
            <RouterLink 
              v-if="authStore.hasPermission('pages.view')"
              to="/pages" 
              class="quick-action-card group"
            >
              <i class="fas fa-file-lines text-3xl text-primary-600 group-hover:scale-110 transition-transform"></i>
              <span class="text-sm font-medium text-gray-700">管理頁面</span>
            </RouterLink>
            
            <RouterLink 
              v-if="authStore.hasPermission('users.view')"
              to="/users" 
              class="quick-action-card group"
            >
              <i class="fas fa-users text-3xl text-primary-600 group-hover:scale-110 transition-transform"></i>
              <span class="text-sm font-medium text-gray-700">管理使用者</span>
            </RouterLink>
            
            <RouterLink 
              to="/profile" 
              class="quick-action-card group"
            >
              <i class="fas fa-gear text-3xl text-primary-600 group-hover:scale-110 group-hover:rotate-90 transition-all"></i>
              <span class="text-sm font-medium text-gray-700">個人設定</span>
            </RouterLink>
          </div>
        </div>
      </div>

    
    </template>
  </div>
</template>
