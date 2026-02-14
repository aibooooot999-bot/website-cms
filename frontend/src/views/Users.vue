<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const api = useApi()

interface User {
  id: string
  username: string
  display_name: string
  email: string
  status: string
  role_name: string
  role_display_name: string
  last_login: string
  created_at: string
}

interface Role {
  id: string
  name: string
  display_name: string
}

const users = ref<User[]>([])
const roles = ref<Role[]>([])
const loading = ref(true)

// Modal state
const showModal = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const editingUser = ref<User | null>(null)
const saving = ref(false)
const modalError = ref('')

const form = ref({
  username: '',
  password: '',
  display_name: '',
  email: '',
  role_id: '',
  status: 'active'
})

async function fetchData() {
  loading.value = true
  const [usersRes, rolesRes] = await Promise.all([
    api.get('/api/users'),
    api.get('/api/roles')
  ])
  if (usersRes.success) users.value = usersRes.data
  if (rolesRes.success) roles.value = rolesRes.data
  loading.value = false
}

function openCreateModal() {
  modalMode.value = 'create'
  editingUser.value = null
  form.value = {
    username: '',
    password: '',
    display_name: '',
    email: '',
    role_id: roles.value[0]?.id || '',
    status: 'active'
  }
  modalError.value = ''
  showModal.value = true
}

function openEditModal(user: User) {
  modalMode.value = 'edit'
  editingUser.value = user
  const role = roles.value.find(r => r.name === user.role_name)
  form.value = {
    username: user.username,
    password: '',
    display_name: user.display_name || '',
    email: user.email || '',
    role_id: role?.id || '',
    status: user.status
  }
  modalError.value = ''
  showModal.value = true
}

async function saveUser() {
  if (!form.value.username || !form.value.role_id) {
    modalError.value = '請填寫必要欄位'
    return
  }
  if (modalMode.value === 'create' && !form.value.password) {
    modalError.value = '請設定密碼'
    return
  }

  saving.value = true
  modalError.value = ''

  let result
  if (modalMode.value === 'create') {
    result = await api.post('/api/users', form.value)
  } else {
    result = await api.put(`/api/users/${editingUser.value!.id}`, {
      display_name: form.value.display_name,
      email: form.value.email,
      role_id: form.value.role_id,
      status: form.value.status
    })
    
    // 如果有設定新密碼
    if (form.value.password) {
      await api.put(`/api/users/${editingUser.value!.id}/password`, {
        new_password: form.value.password
      })
    }
  }

  if (result.success) {
    showModal.value = false
    await fetchData()
  } else {
    modalError.value = result.error || '儲存失敗'
  }
  
  saving.value = false
}

async function deleteUser(user: User) {
  if (!confirm(`確定要刪除使用者「${user.display_name || user.username}」嗎？`)) return
  
  const result = await api.del(`/api/users/${user.id}`)
  if (result.success) {
    users.value = users.value.filter(u => u.id !== user.id)
  } else {
    alert(result.error || '刪除失敗')
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-TW')
}

function getStatusBadge(status: string) {
  return status === 'active' 
    ? { class: 'badge-success', label: '啟用' }
    : { class: 'badge-danger', label: '停用' }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">使用者管理</h1>
        <p class="text-gray-500 mt-1">管理系統使用者與權限</p>
      </div>
      <button 
        v-if="authStore.hasPermission('users.create')"
        @click="openCreateModal"
        class="btn btn-primary"
      >
        <span><i class="fa-solid fa-plus"></i></span>
        <span>新增使用者</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card">
      <div class="card-body flex items-center justify-center py-20">
        <div class="spinner w-8 h-8 border-primary-600"></div>
      </div>
    </div>

    <!-- Users Table -->
    <div v-else class="card">
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>使用者</th>
              <th>帳號</th>
              <th>角色</th>
              <th>狀態</th>
              <th>最後登入</th>
              <th class="text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-medium">
                    {{ user.display_name?.[0] || user.username[0] }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ user.display_name || user.username }}</p>
                    <p class="text-sm text-gray-500">{{ user.email || '-' }}</p>
                  </div>
                </div>
              </td>
              <td>
                <code class="text-sm bg-gray-100 px-2 py-1 rounded">{{ user.username }}</code>
              </td>
              <td>
                <span class="badge badge-info">{{ user.role_display_name }}</span>
              </td>
              <td>
                <span :class="['badge', getStatusBadge(user.status).class]">
                  {{ getStatusBadge(user.status).label }}
                </span>
              </td>
              <td class="text-gray-500 text-sm">{{ formatDate(user.last_login) }}</td>
              <td class="text-right">
                <div class="flex items-center justify-end gap-2">
                  <button 
                    v-if="authStore.hasPermission('users.edit')"
                    @click="openEditModal(user)"
                    class="btn btn-ghost btn-sm"
                  >
                    <i class="fa-solid fa-pen-to-square"></i>
                  </button>
                  <button 
                    v-if="authStore.hasPermission('users.delete') && user.id !== authStore.user?.id"
                    @click="deleteUser(user)"
                    class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                  >
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ modalMode === 'create' ? '新增使用者' : '編輯使用者' }}</h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        <form @submit.prevent="saveUser">
          <div class="modal-body space-y-4">
            <div v-if="modalError" class="alert alert-error">
              {{ modalError }}
            </div>
            
            <div>
              <label class="form-label">帳號 *</label>
              <input
                v-model="form.username"
                type="text"
                class="form-input"
                :disabled="modalMode === 'edit'"
                placeholder="輸入帳號"
              />
            </div>
            
            <div>
              <label class="form-label">
                {{ modalMode === 'create' ? '密碼 *' : '新密碼（留空不修改）' }}
              </label>
              <input
                v-model="form.password"
                type="password"
                class="form-input"
                placeholder="輸入密碼"
              />
            </div>
            
            <div>
              <label class="form-label">顯示名稱</label>
              <input
                v-model="form.display_name"
                type="text"
                class="form-input"
                placeholder="輸入顯示名稱"
              />
            </div>
            
            <div>
              <label class="form-label">電子郵件</label>
              <input
                v-model="form.email"
                type="email"
                class="form-input"
                placeholder="輸入電子郵件"
              />
            </div>
            
            <div>
              <label class="form-label">角色 *</label>
              <select v-model="form.role_id" class="form-select">
                <option v-for="role in roles" :key="role.id" :value="role.id">
                  {{ role.display_name }}
                </option>
              </select>
            </div>
            
            <div v-if="modalMode === 'edit'">
              <label class="form-label">狀態</label>
              <select v-model="form.status" class="form-select">
                <option value="active">啟用</option>
                <option value="inactive">停用</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" @click="showModal = false" class="btn btn-secondary">
              取消
            </button>
            <button type="submit" :disabled="saving" class="btn btn-primary">
              <span v-if="saving" class="spinner"></span>
              <span>{{ saving ? '儲存中...' : '儲存' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
