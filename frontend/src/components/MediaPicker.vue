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

const emit = defineEmits<{
  select: [url: string]
  close: []
}>()

const files = ref<MediaFile[]>([])
const loading = ref(false)
const uploading = ref(false)
const error = ref('')
const searchQuery = ref('')
const activeTab = ref<'select' | 'upload'>('select')

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value
  const query = searchQuery.value.toLowerCase()
  return files.value.filter(f => f.filename.toLowerCase().includes(query))
})

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

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  await uploadFile(file)
  target.value = ''
}

async function uploadFile(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    error.value = '檔案大小超過 5MB'
    return
  }

  uploading.value = true
  error.value = ''

  const formData = new FormData()
  formData.append('image', file)

  try {
    const response = await fetch('http://localhost:3001/api/upload/image', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      },
      body: formData
    })

    const result = await response.json()

    if (result.success) {
      // 上傳成功後直接選擇該圖片
      const fullUrl = `http://localhost:3001${result.data.url}`
      emit('select', fullUrl)
      emit('close')
    } else {
      error.value = result.error || '上傳失敗'
    }
  } catch (e: any) {
    error.value = e.message || '上傳失敗'
  }
  
  uploading.value = false
}

function selectImage(url: string) {
  const fullUrl = `http://localhost:3001${url}`
  emit('select', fullUrl)
  emit('close')
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

onMounted(loadMedia)
</script>

<template>
  <!-- Modal Overlay -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="emit('close')">
    <!-- Modal -->
    <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <h2 class="text-xl font-bold text-gray-900">選擇圖片</h2>
        <button
          @click="emit('close')"
          class="text-gray-400 hover:text-gray-600 transition"
        >
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b px-4">
        <button
          @click="activeTab = 'select'"
          :class="[
            'px-4 py-3 font-medium transition',
            activeTab === 'select'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          <i class="fas fa-images mr-2"></i>
          選擇圖片
        </button>
        <button
          @click="activeTab = 'upload'"
          :class="[
            'px-4 py-3 font-medium transition',
            activeTab === 'upload'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          ]"
        >
          <i class="fas fa-upload mr-2"></i>
          上傳圖片
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="mx-4 mt-4">
        <div class="alert alert-error">
          <span>{{ error }}</span>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Select Tab -->
        <div v-if="activeTab === 'select'">
          <!-- Search -->
          <div class="mb-4">
            <input
              v-model="searchQuery"
              type="text"
              class="form-input"
              placeholder="搜尋檔案..."
            />
          </div>

          <!-- Loading -->
          <div v-if="loading" class="flex items-center justify-center py-20">
            <div class="spinner w-8 h-8 border-primary-600"></div>
          </div>

          <!-- Empty -->
          <div v-else-if="filteredFiles.length === 0" class="text-center py-20">
            <i class="fas fa-images text-5xl text-gray-300 mb-4"></i>
            <p class="text-gray-500">
              {{ searchQuery ? '找不到符合的檔案' : '尚未上傳任何圖片' }}
            </p>
          </div>

          <!-- Grid -->
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            <div
              v-for="file in filteredFiles"
              :key="file.filename"
              @click="selectImage(file.url)"
              class="border rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary-500 transition group"
            >
              <div class="aspect-square bg-gray-100">
                <img
                  :src="`http://localhost:3001${file.url}`"
                  :alt="file.filename"
                  class="w-full h-full object-cover group-hover:scale-110 transition"
                />
              </div>
              <div class="p-2">
                <p class="text-xs text-gray-900 truncate" :title="file.filename">
                  {{ file.filename }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ formatSize(file.size) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Upload Tab -->
        <div v-else class="py-12">
          <div class="max-w-md mx-auto">
            <div class="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <i class="fas fa-cloud-upload-alt text-5xl text-gray-400 mb-4"></i>
              <p class="text-gray-600 mb-4">選擇圖片上傳</p>
              <label class="btn btn-primary cursor-pointer">
                <i class="fas fa-upload mr-2"></i>
                選擇檔案
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                  :disabled="uploading"
                />
              </label>
              <p class="text-sm text-gray-500 mt-4">
                支援 JPG, PNG, GIF, WEBP（最大 5MB）
              </p>
              <div v-if="uploading" class="mt-4">
                <div class="spinner w-6 h-6 border-primary-600 mx-auto"></div>
                <p class="text-sm text-gray-600 mt-2">上傳中...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
