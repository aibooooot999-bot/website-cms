<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const api = useApi()
const authStore = useAuthStore()

interface MediaFile {
  filename: string
  url: string
  size: number
  uploadedAt: string
}

const files = ref<MediaFile[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const searchQuery = ref('')

// 搜尋過濾
const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  const query = searchQuery.value.toLowerCase()
  return files.value.filter(f => f.filename.toLowerCase().includes(query))
})

// 載入媒體列表
async function loadMedia() {
  loading.value = true
  error.value = ''
  
  const result = await api.get('/api/media')
  
  if (result.success) {
    files.value = result.data
  } else {
    error.value = result.error || '載入失敗'
  }
  
  loading.value = false
}

// 檔案上傳
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const fileList = target.files
  
  if (!fileList || fileList.length === 0) return
  
  await uploadFiles(fileList)
  
  // 清空 input
  target.value = ''
}

// 拖曳上傳
function handleDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  
  const fileList = event.dataTransfer?.files
  if (fileList && fileList.length > 0) {
    uploadFiles(fileList)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
}

// 上傳多個檔案
async function uploadFiles(fileList: FileList) {
  uploading.value = true
  error.value = ''
  
  const uploadPromises = Array.from(fileList).map(file => uploadSingleFile(file))
  
  try {
    await Promise.all(uploadPromises)
    await loadMedia() // 重新載入列表
  } catch (e: any) {
    error.value = e.message || '上傳失敗'
  }
  
  uploading.value = false
}

// 上傳單一檔案
async function uploadSingleFile(file: File): Promise<void> {
  // 檢查檔案大小
  if (file.size > 5 * 1024 * 1024) {
    throw new Error(`${file.name} 超過 5MB 限制`)
  }

  const formData = new FormData()
  formData.append('image', file)

  const response = await fetch('http://localhost:3001/api/upload/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authStore.token}`
    },
    body: formData
  })

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || `${file.name} 上傳失敗`)
  }
}

// 刪除檔案
async function deleteFile(filename: string) {
  if (!confirm(`確定要刪除 ${filename} 嗎？`)) return
  
  const result = await api.delete(`/api/media/${filename}`)
  
  if (result.success) {
    await loadMedia()
  } else {
    error.value = result.error || '刪除失敗'
  }
}

// 複製 URL
function copyUrl(url: string) {
  const fullUrl = `http://localhost:3001${url}`
  navigator.clipboard.writeText(fullUrl).then(() => {
    alert('URL 已複製到剪貼簿')
  })
}

// 格式化檔案大小
function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// 格式化日期
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(loadMedia)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">媒體庫</h1>
      <p class="text-gray-500 mt-1">管理上傳的圖片檔案</p>
    </div>

    <!-- Error -->
    <div v-if="error" class="alert alert-error mb-4">
      <span>{{ error }}</span>
    </div>

    <!-- Toolbar -->
    <div class="card mb-6">
      <div class="card-body">
        <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <!-- Upload -->
          <div class="flex gap-2">
            <label class="btn btn-primary cursor-pointer">
              <i class="fas fa-upload mr-2"></i>
              上傳圖片
              <input
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="handleFileSelect"
                :disabled="uploading"
              />
            </label>
            <button
              v-if="uploading"
              class="btn btn-secondary"
              disabled
            >
              <span class="spinner"></span>
              上傳中...
            </button>
          </div>

          <!-- Search -->
          <div class="w-full sm:w-64">
            <input
              v-model="searchQuery"
              type="text"
              class="form-input"
              placeholder="搜尋檔案..."
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Drop Zone -->
    <div
      class="card mb-6 border-2 border-dashed border-gray-300 hover:border-primary-500 transition"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <div class="card-body text-center py-12">
        <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-4"></i>
        <p class="text-gray-600 mb-2">拖曳圖片到此處上傳</p>
        <p class="text-sm text-gray-500">支援 JPG, PNG, GIF, WEBP（最大 5MB）</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card">
      <div class="card-body flex items-center justify-center py-20">
        <div class="spinner w-8 h-8 border-primary-600"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredFiles.length === 0" class="card">
      <div class="card-body text-center py-20">
        <i class="fas fa-images text-5xl text-gray-300 mb-4"></i>
        <p class="text-gray-500">
          {{ searchQuery ? '找不到符合的檔案' : '尚未上傳任何圖片' }}
        </p>
      </div>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      <div
        v-for="file in filteredFiles"
        :key="file.filename"
        class="card group relative overflow-hidden"
      >
        <!-- Image -->
        <div class="aspect-square bg-gray-100 overflow-hidden">
          <img
            :src="`http://localhost:3001${file.url}`"
            :alt="file.filename"
            class="w-full h-full object-cover group-hover:scale-110 transition"
          />
        </div>

        <!-- Info -->
        <div class="p-3">
          <p class="text-xs font-medium text-gray-900 truncate" :title="file.filename">
            {{ file.filename }}
          </p>
          <p class="text-xs text-gray-500 mt-1">
            {{ formatSize(file.size) }}
          </p>
          <p class="text-xs text-gray-400">
            {{ formatDate(file.uploadedAt) }}
          </p>
        </div>

        <!-- Actions -->
        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition flex gap-1">
          <button
            @click="copyUrl(file.url)"
            class="btn-icon bg-white shadow-md hover:bg-gray-100"
            title="複製 URL"
          >
            <i class="fas fa-copy text-xs"></i>
          </button>
          <button
            @click="deleteFile(file.filename)"
            class="btn-icon bg-red-500 text-white shadow-md hover:bg-red-600"
            title="刪除"
          >
            <i class="fas fa-trash text-xs"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Stats -->
    <div v-if="files.length > 0" class="mt-6 text-center text-sm text-gray-500">
      共 {{ files.length }} 個檔案
      <span v-if="searchQuery">（顯示 {{ filteredFiles.length }} 個）</span>
    </div>
  </div>
</template>

<style scoped>
.btn-icon {
  @apply w-8 h-8 flex items-center justify-center rounded-md transition;
}
</style>
