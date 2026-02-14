<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const api = useApi()

interface Role {
  id: string
  name: string
  display_name: string
  description: string
  permissions: string[]
  is_system: number
}

interface Permission {
  id: string
  name: string
  category: string
}

const roles = ref<Role[]>([])
const allPermissions = ref<Permission[]>([])
const loading = ref(true)

// Modal state
const showModal = ref(false)
const modalMode = ref<'create' | 'edit' | 'view'>('view')
const editingRole = ref<Role | null>(null)
const saving = ref(false)
const modalError = ref('')

const form = ref({
  name: '',
  display_name: '',
  description: '',
  permissions: [] as string[]
})

// Group permissions by category
const permissionsByCategory = computed(() => {
  const grouped: Record<string, Permission[]> = {}
  for (const perm of allPermissions.value) {
    if (!grouped[perm.category]) grouped[perm.category] = []
    grouped[perm.category].push(perm)
  }
  return grouped
})

async function fetchData() {
  loading.value = true
  const [rolesRes, permsRes] = await Promise.all([
    api.get('/api/roles'),
    api.get('/api/roles/permissions')
  ])
  if (rolesRes.success) roles.value = rolesRes.data
  if (permsRes.success) allPermissions.value = permsRes.data
  loading.value = false
}

function openViewModal(role: Role) {
  modalMode.value = 'view'
  editingRole.value = role
  showModal.value = true
}

function openCreateModal() {
  modalMode.value = 'create'
  editingRole.value = null
  form.value = {
    name: '',
    display_name: '',
    description: '',
    permissions: []
  }
  modalError.value = ''
  showModal.value = true
}

function openEditModal(role: Role) {
  if (role.is_system) {
    alert('系統角色無法編輯')
    return
  }
  modalMode.value = 'edit'
  editingRole.value = role
  form.value = {
    name: role.name,
    display_name: role.display_name,
    description: role.description || '',
    permissions: [...role.permissions]
  }
  modalError.value = ''
  showModal.value = true
}

async function saveRole() {
  if (!form.value.name || !form.value.display_name) {
    modalError.value = '請填寫必要欄位'
    return
  }

  saving.value = true
  modalError.value = ''

  let result
  if (modalMode.value === 'create') {
    result = await api.post('/api/roles', form.value)
  } else {
    result = await api.put(`/api/roles/${editingRole.value!.id}`, {
      display_name: form.value.display_name,
      description: form.value.description,
      permissions: form.value.permissions
    })
  }

  if (result.success) {
    showModal.value = false
    await fetchData()
  } else {
    modalError.value = result.error || '儲存失敗'
  }
  
  saving.value = false
}

async function deleteRole(role: Role) {
  if (role.is_system) {
    alert('系統角色無法刪除')
    return
  }
  if (!confirm(`確定要刪除角色「${role.display_name}」嗎？`)) return
  
  const result = await api.del(`/api/roles/${role.id}`)
  if (result.success) {
    roles.value = roles.value.filter(r => r.id !== role.id)
  } else {
    alert(result.error || '刪除失敗')
  }
}

function togglePermission(permId: string) {
  const idx = form.value.permissions.indexOf(permId)
  if (idx > -1) {
    form.value.permissions.splice(idx, 1)
  } else {
    form.value.permissions.push(permId)
  }
}

function hasPermission(permId: string) {
  return form.value.permissions.includes(permId)
}

function getPermissionLabel(permId: string) {
  const perm = allPermissions.value.find(p => p.id === permId)
  return perm?.name || permId
}

onMounted(fetchData)
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">角色權限</h1>
        <p class="text-gray-500 mt-1">管理系統角色與權限設定</p>
      </div>
      <button 
        v-if="authStore.hasPermission('roles.manage')"
        @click="openCreateModal"
        class="btn btn-primary"
      >
        <span><i class="fa-solid fa-plus"></i></span>
        <span>新增角色</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card">
      <div class="card-body flex items-center justify-center py-20">
        <div class="spinner w-8 h-8 border-primary-600"></div>
      </div>
    </div>

    <!-- Roles Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="role in roles" :key="role.id" class="card">
        <div class="card-body">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="font-semibold text-gray-900">{{ role.display_name }}</h3>
              <p class="text-sm text-gray-500 mt-1">{{ role.description || '無描述' }}</p>
            </div>
            <span v-if="role.is_system" class="badge badge-info">系統</span>
          </div>
          
          <div class="mb-4">
            <p class="text-sm text-gray-500 mb-2">權限：</p>
            <div class="flex flex-wrap gap-1">
              <template v-if="role.permissions.includes('*')">
                <span class="badge badge-success">所有權限</span>
              </template>
              <template v-else-if="role.permissions.length > 0">
                <span 
                  v-for="perm in role.permissions.slice(0, 3)" 
                  :key="perm"
                  class="badge badge-gray text-xs"
                >
                  {{ getPermissionLabel(perm) }}
                </span>
                <span v-if="role.permissions.length > 3" class="badge badge-gray text-xs">
                  +{{ role.permissions.length - 3 }}
                </span>
              </template>
              <span v-else class="text-sm text-gray-400">無權限</span>
            </div>
          </div>
          
          <div class="flex items-center gap-2 pt-4 border-t border-gray-100">
            <button @click="openViewModal(role)" class="btn btn-ghost btn-sm flex-1">
              <i class="fa-solid fa-eye"></i> 檢視
            </button>
            <button 
              v-if="authStore.hasPermission('roles.manage') && !role.is_system"
              @click="openEditModal(role)" 
              class="btn btn-ghost btn-sm flex-1"
            >
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button 
              v-if="authStore.hasPermission('roles.manage') && !role.is_system"
              @click="deleteRole(role)"
              class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal-backdrop" @click.self="showModal = false">
      <div class="modal max-w-2xl">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ modalMode === 'create' ? '新增角色' : modalMode === 'edit' ? '編輯角色' : '檢視角色' }}
          </h3>
          <button @click="showModal = false" class="text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
        
        <!-- View Mode -->
        <div v-if="modalMode === 'view' && editingRole" class="modal-body">
          <div class="mb-4">
            <p class="text-sm text-gray-500">角色名稱</p>
            <p class="font-medium">{{ editingRole.display_name }}</p>
          </div>
          <div class="mb-4">
            <p class="text-sm text-gray-500">描述</p>
            <p>{{ editingRole.description || '無' }}</p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-2">權限列表</p>
            <div class="flex flex-wrap gap-2">
              <template v-if="editingRole.permissions.includes('*')">
                <span class="badge badge-success">所有權限</span>
              </template>
              <template v-else>
                <span 
                  v-for="perm in editingRole.permissions" 
                  :key="perm"
                  class="badge badge-gray"
                >
                  {{ getPermissionLabel(perm) }}
                </span>
              </template>
            </div>
          </div>
        </div>

        <!-- Edit/Create Mode -->
        <form v-else @submit.prevent="saveRole">
          <div class="modal-body space-y-4">
            <div v-if="modalError" class="alert alert-error">
              {{ modalError }}
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="form-label">識別碼 *</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-input"
                  :disabled="modalMode === 'edit'"
                  placeholder="role_name"
                />
              </div>
              <div>
                <label class="form-label">顯示名稱 *</label>
                <input
                  v-model="form.display_name"
                  type="text"
                  class="form-input"
                  placeholder="角色名稱"
                />
              </div>
            </div>
            
            <div>
              <label class="form-label">描述</label>
              <input
                v-model="form.description"
                type="text"
                class="form-input"
                placeholder="角色描述"
              />
            </div>
            
            <div>
              <label class="form-label">權限設定</label>
              <div class="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div v-for="(perms, category) in permissionsByCategory" :key="category" class="mb-4 last:mb-0">
                  <p class="text-sm font-medium text-gray-700 mb-2">{{ category }}</p>
                  <div class="grid grid-cols-2 gap-2">
                    <label 
                      v-for="perm in perms" 
                      :key="perm.id"
                      class="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :checked="hasPermission(perm.id)"
                        @change="togglePermission(perm.id)"
                        class="form-checkbox"
                      />
                      <span class="text-sm">{{ perm.name }}</span>
                    </label>
                  </div>
                </div>
              </div>
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
