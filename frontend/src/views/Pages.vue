<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

interface Page {
  id: string
  title: string
  slug: string
  status: string
  template: string
  created_by_name: string
  created_at: string
  updated_at: string
}

const pages = ref<Page[]>([])
const loading = ref(true)
const deleting = ref<string | null>(null)

async function fetchPages() {
  loading.value = true
  const result = await api.get('/api/pages')
  if (result.success) {
    pages.value = result.data
  }
  loading.value = false
}

async function deletePage(page: Page) {
  if (!confirm(`確定要刪除「${page.title}」嗎？`)) return
  
  deleting.value = page.id
  const result = await api.del(`/api/pages/${page.id}`)
  if (result.success) {
    pages.value = pages.value.filter(p => p.id !== page.id)
  } else {
    alert(result.error || '刪除失敗')
  }
  deleting.value = null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-TW')
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'published': return { class: 'badge-success', label: '已發布' }
    case 'draft': return { class: 'badge-gray', label: '草稿' }
    default: return { class: 'badge-gray', label: status }
  }
}

onMounted(fetchPages)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">頁面管理</h1>
        <p class="text-gray-500 mt-1">管理網站頁面內容</p>
      </div>
      <RouterLink 
        v-if="authStore.hasPermission('pages.create')"
        to="/pages/create" 
        class="btn btn-primary"
      >
        <span><i class="fa-solid fa-plus"></i></span>
        <span>新增頁面</span>
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card">
      <div class="card-body flex items-center justify-center py-20">
        <div class="spinner w-8 h-8 border-primary-600"></div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="pages.length === 0" class="card">
      <div class="card-body text-center py-20">
        <div class="text-5xl mb-4">📄</div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">尚無頁面</h3>
        <p class="text-gray-500 mb-6">開始建立您的第一個頁面</p>
        <RouterLink 
          v-if="authStore.hasPermission('pages.create')"
          to="/pages/create" 
          class="btn btn-primary"
        >
          新增頁面
        </RouterLink>
      </div>
    </div>

    <!-- Pages Table -->
    <div v-else class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>標題</th>
              <th>網址代稱</th>
              <th>狀態</th>
              <th>建立者</th>
              <th>更新時間</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="page in pages" :key="page.id">
              <td>
                <span class="font-medium text-gray-900">{{ page.title }}</span>
              </td>
              <td>
                <code class="text-sm bg-gray-100 px-2 py-1 rounded">/{{ page.slug }}</code>
              </td>
              <td>
                <span :class="['badge', getStatusBadge(page.status).class]">
                  {{ getStatusBadge(page.status).label }}
                </span>
              </td>
              <td>{{ page.created_by_name || '-' }}</td>
              <td>{{ formatDate(page.updated_at) }}</td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <RouterLink 
                    v-if="authStore.hasPermission('pages.edit')"
                    :to="`/pages/${page.id}/edit`"
                    class="btn btn-ghost btn-sm"
                  >
                    <i class="fa-solid fa-pen-to-square"></i> 
                  </RouterLink>
                  <button 
                    v-if="authStore.hasPermission('pages.delete')"
                    @click="deletePage(page)"
                    :disabled="deleting === page.id"
                    class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  >
                    <span v-if="deleting === page.id" class="spinner w-4 h-4"></span>
                    <span v-else><i class="fa-solid fa-trash"></i></span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
