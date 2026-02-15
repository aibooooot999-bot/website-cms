<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const api = useApi()

const isEdit = computed(() => !!route.params.id)
const pageId = computed(() => route.params.id as string)

const form = ref({
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  status: 'draft',
  template: 'default',
  meta_title: '',
  meta_description: ''
})

const loading = ref(false)
const saving = ref(false)
const error = ref('')

const templates = [
  { value: 'default', label: '預設模板' },
  { value: 'full-width', label: '全寬模板' },
  { value: 'sidebar', label: '側邊欄模板' },
  { value: 'landing', label: '著陸頁模板' },
]

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '發布' },
]

// Quill 設定
const editorOptions = {
  theme: 'snow',
  modules: {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }
}

const quillEditor = ref()

// 圖片上傳處理
function imageHandler() {
  const input = document.createElement('input')
  input.setAttribute('type', 'file')
  input.setAttribute('accept', 'image/*')
  input.click()

  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    // 檢查檔案大小
    if (file.size > 5 * 1024 * 1024) {
      error.value = '圖片大小不可超過 5MB'
      return
    }

    // 上傳圖片
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
        const imageUrl = `http://localhost:3001${result.data.url}`
        const quill = quillEditor.value.getQuill()
        const range = quill.getSelection()
        quill.insertEmbed(range.index, 'image', imageUrl)
        quill.setSelection(range.index + 1)
      } else {
        error.value = result.error || '圖片上傳失敗'
      }
    } catch (e: any) {
      error.value = e.message || '圖片上傳失敗'
    }
  }
}

async function fetchPage() {
  if (!isEdit.value) return
  
  loading.value = true
  const result = await api.get(`/api/pages/${pageId.value}`)
  if (result.success) {
    const page = result.data
    form.value = {
      title: page.title || '',
      slug: page.slug || '',
      content: page.content || '',
      excerpt: page.excerpt || '',
      status: page.status || 'draft',
      template: page.template || 'default',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || ''
    }
  } else {
    error.value = result.error || '載入失敗'
  }
  loading.value = false
}

function generateSlug() {
  if (form.value.slug) return
  // 簡單的 slug 生成（可以改用更好的庫）
  form.value.slug = form.value.title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function save() {
  if (!form.value.title || !form.value.slug) {
    error.value = '請填寫標題和網址代稱'
    return
  }

  saving.value = true
  error.value = ''

  const result = isEdit.value
    ? await api.put(`/api/pages/${pageId.value}`, form.value)
    : await api.post('/api/pages', form.value)

  if (result.success) {
    router.push('/pages')
  } else {
    error.value = result.error || '儲存失敗'
  }
  
  saving.value = false
}

onMounted(fetchPage)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ isEdit ? '編輯頁面' : '新增頁面' }}
        </h1>
        <p class="text-gray-500 mt-1">
          {{ isEdit ? '修改頁面內容與設定' : '建立新的網站頁面' }}
        </p>
      </div>
      <RouterLink to="/pages" class="btn btn-secondary">
        ← 返回列表
      </RouterLink>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card">
      <div class="card-body flex items-center justify-center py-20">
        <div class="spinner w-8 h-8 border-primary-600"></div>
      </div>
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="save" class="space-y-6">
      <!-- Error -->
      <div v-if="error" class="alert alert-error">
        <span>{{ error }}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Content -->
        <div class="lg:col-span-2 space-y-6">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">基本資訊</h2>
            </div>
            <div class="card-body space-y-4">
              <div>
                <label class="form-label">標題 *</label>
                <input
                  v-model="form.title"
                  @blur="generateSlug"
                  type="text"
                  class="form-input"
                  placeholder="輸入頁面標題"
                />
              </div>
              
              <div>
                <label class="form-label">網址代稱 *</label>
                <div class="flex items-center gap-2">
                  <span class="text-gray-500">/</span>
                  <input
                    v-model="form.slug"
                    type="text"
                    class="form-input"
                    placeholder="page-slug"
                  />
                </div>
              </div>
              
              <div>
                <label class="form-label">摘要</label>
                <textarea
                  v-model="form.excerpt"
                  class="form-textarea"
                  rows="2"
                  placeholder="頁面簡短描述..."
                ></textarea>
              </div>
              
              <div>
                <label class="form-label">內容</label>
                <QuillEditor 
                  ref="quillEditor"
                  v-model:content="form.content"
                  contentType="html"
                  :options="editorOptions"
                  style="min-height: 400px;"
                />
              </div>
            </div>
          </div>

          <!-- SEO -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">SEO 設定</h2>
            </div>
            <div class="card-body space-y-4">
              <div>
                <label class="form-label">Meta 標題</label>
                <input
                  v-model="form.meta_title"
                  type="text"
                  class="form-input"
                  placeholder="SEO 標題（留空使用頁面標題）"
                />
              </div>
              
              <div>
                <label class="form-label">Meta 描述</label>
                <textarea
                  v-model="form.meta_description"
                  class="form-textarea"
                  rows="2"
                  placeholder="SEO 描述..."
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Publish -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">發布</h2>
            </div>
            <div class="card-body space-y-4">
              <div>
                <label class="form-label">狀態</label>
                <select v-model="form.status" class="form-select">
                  <option 
                    v-for="opt in statusOptions" 
                    :key="opt.value" 
                    :value="opt.value"
                    :disabled="opt.value === 'published' && !authStore.hasPermission('pages.publish')"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              
              <div>
                <label class="form-label">模板</label>
                <select v-model="form.template" class="form-select">
                  <option v-for="tpl in templates" :key="tpl.value" :value="tpl.value">
                    {{ tpl.label }}
                  </option>
                </select>
              </div>

              <button
                type="submit"
                :disabled="saving"
                class="btn btn-primary w-full"
              >
                <span v-if="saving" class="spinner"></span>
                <span>{{ saving ? '儲存中...' : (isEdit ? '更新頁面' : '建立頁面') }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

<style scoped>
/* Quill 編輯器樣式調整 */
:deep(.ql-container) {
  min-height: 350px;
  font-family: inherit;
}

:deep(.ql-editor) {
  min-height: 350px;
  font-size: 16px;
  line-height: 1.6;
}

:deep(.ql-toolbar) {
  background: #f9fafb;
  border-color: #e5e7eb;
  border-radius: 0.5rem 0.5rem 0 0;
}

:deep(.ql-container) {
  border-color: #e5e7eb;
  border-radius: 0 0 0.5rem 0.5rem;
}
</style>
