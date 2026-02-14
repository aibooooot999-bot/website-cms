<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '../composables/useApi'

interface Activity {
  id: string
  user_name: string
  action: string
  details: string
  created_at: string
}

const activities = ref<Activity[]>([])
const loading = ref(true)
const currentPage = ref(1)
const pageSize = ref(20)
const totalCount = ref(0)

const pageSizeOptions = [20, 50, 100]

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

onMounted(() => {
  loadActivities()
})

async function loadActivities() {
  loading.value = true
  const api = useApi()
  
  const offset = (currentPage.value - 1) * pageSize.value
  const res = await api.get(`/api/dashboard/activities?limit=${pageSize.value}&offset=${offset}`)
  
  if (res.success) {
    activities.value = res.data || []
    totalCount.value = res.total || activities.value.length
  }
  
  loading.value = false
}

function changePage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
    loadActivities()
  }
}

function changePageSize(size: number) {
  pageSize.value = size
  currentPage.value = 1
  loadActivities()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
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
    'page.publish': '發布頁面',
    'page.unpublish': '取消發布',
    'role.create': '建立角色',
    'role.update': '更新角色',
    'role.delete': '刪除角色',
  }
  return labels[action] || action
}

function getActionBadgeClass(action: string) {
  if (action.includes('create')) return 'badge-success'
  if (action.includes('update')) return 'badge-info'
  if (action.includes('delete')) return 'badge-danger'
  if (action.includes('login')) return 'badge-gray'
  if (action.includes('publish')) return 'badge-warning'
  return 'badge-gray'
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <i class="fas fa-clock-rotate-left text-primary-600"></i>
          活動記錄
        </h1>
        <p class="text-gray-500 mt-1">查看系統所有操作記錄</p>
      </div>
      
      <!-- Page Size Selector -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600">每頁顯示：</span>
        <div class="flex gap-1">
          <button
            v-for="size in pageSizeOptions"
            :key="size"
            @click="changePageSize(size)"
            :class="[
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              pageSize === size
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
          >
            {{ size }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="spinner w-8 h-8 border-primary-600"></div>
    </div>

    <!-- Activities Table -->
    <div v-else class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>使用者</th>
              <th>動作</th>
              <th>詳情</th>
              <th>時間</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="activities.length === 0">
              <td colspan="4" class="text-center py-8 text-gray-500">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>目前沒有活動記錄</p>
              </td>
            </tr>
            <tr v-for="activity in activities" :key="activity.id" class="group">
              <td>
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium group-hover:scale-110 transition-transform">
                    {{ activity.user_name?.[0] || '?' }}
                  </div>
                  <span class="font-medium">{{ activity.user_name || '未知' }}</span>
                </div>
              </td>
              <td>
                <span :class="['badge', getActionBadgeClass(activity.action)]">
                  {{ getActionLabel(activity.action) }}
                </span>
              </td>
              <td class="text-gray-600 max-w-md truncate">{{ activity.details }}</td>
              <td class="text-gray-500 text-sm">
                <i class="fas fa-clock mr-1"></i>
                {{ formatDate(activity.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-600">
          顯示第 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, totalCount) }} 筆，共 {{ totalCount }} 筆
        </div>
        
        <div class="flex items-center gap-1">
          <!-- First Page -->
          <button
            @click="changePage(1)"
            :disabled="currentPage === 1"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <i class="fas fa-angles-left"></i>
          </button>
          
          <!-- Previous Page -->
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <i class="fas fa-angle-left"></i>
          </button>
          
          <!-- Page Numbers -->
          <template v-for="page in totalPages" :key="page">
            <button
              v-if="page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1"
              @click="changePage(page)"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-primary-600 text-white'
                  : 'hover:bg-gray-100 text-gray-700'
              ]"
            >
              {{ page }}
            </button>
            <span
              v-else-if="page === currentPage - 2 || page === currentPage + 2"
              class="px-2 text-gray-400"
            >
              ...
            </span>
          </template>
          
          <!-- Next Page -->
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <i class="fas fa-angle-right"></i>
          </button>
          
          <!-- Last Page -->
          <button
            @click="changePage(totalPages)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            <i class="fas fa-angles-right"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
