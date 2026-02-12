<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '請輸入帳號和密碼'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const result = await authStore.login(username.value, password.value)
    if (result.success) {
      const redirect = route.query.redirect as string || '/'
      router.push(redirect)
    } else {
      error.value = result.error || '登入失敗'
    }
  } catch (e: any) {
    error.value = e.response?.data?.error || '登入失敗'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
          <span class="text-3xl">🏢</span>
        </div>
        <h1 class="text-2xl font-bold text-white">CMS 管理後台</h1>
        <p class="text-primary-200 mt-1">企業官網內容管理系統</p>
      </div>

      <!-- Login Card -->
      <div class="bg-white rounded-2xl shadow-xl p-8">
        <h2 class="text-xl font-semibold text-gray-900 mb-6">登入</h2>
        
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Error Alert -->
          <div v-if="error" class="alert alert-error">
            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <span>{{ error }}</span>
          </div>

          <!-- Username -->
          <div>
            <label class="form-label">帳號</label>
            <input
              v-model="username"
              type="text"
              class="form-input"
              placeholder="請輸入帳號"
              autocomplete="username"
            />
          </div>

          <!-- Password -->
          <div>
            <label class="form-label">密碼</label>
            <input
              v-model="password"
              type="password"
              class="form-input"
              placeholder="請輸入密碼"
              autocomplete="current-password"
            />
          </div>

          <!-- Submit -->
          <button
            type="submit"
            class="btn btn-primary w-full"
            :disabled="loading"
          >
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? '登入中...' : '登入' }}</span>
          </button>
        </form>

        <!-- Demo Info -->
        <div class="mt-6 pt-6 border-t border-gray-200">
          <p class="text-sm text-gray-500 text-center">
            預設帳號: <code class="bg-gray-100 px-1.5 py-0.5 rounded">admin</code>
            密碼: <code class="bg-gray-100 px-1.5 py-0.5 rounded">admin123</code>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
