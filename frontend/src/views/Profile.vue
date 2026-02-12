<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const api = useApi()

const profile = ref({
  display_name: '',
  email: ''
})

const password = ref({
  current: '',
  new: '',
  confirm: ''
})

const profileSaving = ref(false)
const passwordSaving = ref(false)
const profileSuccess = ref('')
const profileError = ref('')
const passwordSuccess = ref('')
const passwordError = ref('')

onMounted(() => {
  if (authStore.user) {
    profile.value.display_name = authStore.user.display_name || ''
    profile.value.email = authStore.user.email || ''
  }
})

async function updateProfile() {
  profileSaving.value = true
  profileSuccess.value = ''
  profileError.value = ''
  
  const result = await api.put(`/api/users/${authStore.user!.id}`, {
    display_name: profile.value.display_name,
    email: profile.value.email
  })
  
  if (result.success) {
    profileSuccess.value = '個人資料已更新'
    await authStore.fetchUser()
  } else {
    profileError.value = result.error || '更新失敗'
  }
  
  profileSaving.value = false
}

async function updatePassword() {
  if (password.value.new !== password.value.confirm) {
    passwordError.value = '新密碼與確認密碼不符'
    return
  }
  if (password.value.new.length < 6) {
    passwordError.value = '密碼至少需要 6 個字元'
    return
  }

  passwordSaving.value = true
  passwordSuccess.value = ''
  passwordError.value = ''
  
  const result = await api.put(`/api/users/${authStore.user!.id}/password`, {
    current_password: password.value.current,
    new_password: password.value.new
  })
  
  if (result.success) {
    passwordSuccess.value = '密碼已更新'
    password.value = { current: '', new: '', confirm: '' }
  } else {
    passwordError.value = result.error || '更新失敗'
  }
  
  passwordSaving.value = false
}
</script>

<template>
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">個人設定</h1>
      <p class="text-gray-500 mt-1">管理您的帳號資訊與安全設定</p>
    </div>

    <!-- Profile Card -->
    <div class="card mb-6">
      <div class="card-header">
        <h2 class="card-title">基本資料</h2>
      </div>
      <form @submit.prevent="updateProfile">
        <div class="card-body space-y-4">
          <div v-if="profileSuccess" class="alert alert-success">
            {{ profileSuccess }}
          </div>
          <div v-if="profileError" class="alert alert-error">
            {{ profileError }}
          </div>
          
          <div>
            <label class="form-label">帳號</label>
            <input
              :value="authStore.user?.username"
              type="text"
              class="form-input bg-gray-50"
              disabled
            />
          </div>
          
          <div>
            <label class="form-label">顯示名稱</label>
            <input
              v-model="profile.display_name"
              type="text"
              class="form-input"
              placeholder="輸入顯示名稱"
            />
          </div>
          
          <div>
            <label class="form-label">電子郵件</label>
            <input
              v-model="profile.email"
              type="email"
              class="form-input"
              placeholder="輸入電子郵件"
            />
          </div>
          
          <div>
            <label class="form-label">角色</label>
            <input
              :value="authStore.user?.role?.display_name"
              type="text"
              class="form-input bg-gray-50"
              disabled
            />
          </div>
          
          <div class="pt-4">
            <button type="submit" :disabled="profileSaving" class="btn btn-primary">
              <span v-if="profileSaving" class="spinner"></span>
              <span>{{ profileSaving ? '儲存中...' : '更新資料' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Password Card -->
    <div class="card">
      <div class="card-header">
        <h2 class="card-title">變更密碼</h2>
      </div>
      <form @submit.prevent="updatePassword">
        <div class="card-body space-y-4">
          <div v-if="passwordSuccess" class="alert alert-success">
            {{ passwordSuccess }}
          </div>
          <div v-if="passwordError" class="alert alert-error">
            {{ passwordError }}
          </div>
          
          <div>
            <label class="form-label">目前密碼</label>
            <input
              v-model="password.current"
              type="password"
              class="form-input"
              placeholder="輸入目前密碼"
            />
          </div>
          
          <div>
            <label class="form-label">新密碼</label>
            <input
              v-model="password.new"
              type="password"
              class="form-input"
              placeholder="輸入新密碼（至少 6 字元）"
            />
          </div>
          
          <div>
            <label class="form-label">確認新密碼</label>
            <input
              v-model="password.confirm"
              type="password"
              class="form-input"
              placeholder="再次輸入新密碼"
            />
          </div>
          
          <div class="pt-4">
            <button type="submit" :disabled="passwordSaving" class="btn btn-primary">
              <span v-if="passwordSaving" class="spinner"></span>
              <span>{{ passwordSaving ? '儲存中...' : '變更密碼' }}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
