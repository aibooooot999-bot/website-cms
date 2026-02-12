<script setup lang="ts">
import { ref, computed } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const sidebarOpen = ref(true)
const userMenuOpen = ref(false)

const menuItems = computed(() => [
  { 
    name: '儀表板', 
    icon: '📊', 
    to: '/', 
    active: route.path === '/' 
  },
  { 
    name: '頁面管理', 
    icon: '📄', 
    to: '/pages', 
    active: route.path.startsWith('/pages'),
    permission: 'pages.view'
  },
  { 
    name: '使用者管理', 
    icon: '👥', 
    to: '/users', 
    active: route.path === '/users',
    permission: 'users.view'
  },
  { 
    name: '角色權限', 
    icon: '🛡️', 
    to: '/roles', 
    active: route.path === '/roles',
    permission: 'roles.view'
  },
])

const visibleMenuItems = computed(() => 
  menuItems.value.filter(item => 
    !item.permission || authStore.hasPermission(item.permission)
  )
)

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen bg-gray-100">
    <!-- Sidebar -->
    <aside 
      :class="[
        'sidebar',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
      ]"
    >
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-xl">
            🏢
          </div>
          <span v-show="sidebarOpen" class="text-lg font-bold text-white">CMS</span>
        </div>
      </div>

      <!-- Menu -->
      <nav class="sidebar-menu flex-1 overflow-y-auto scrollbar-thin">
        <div class="sidebar-section" v-show="sidebarOpen">主選單</div>
        
        <RouterLink
          v-for="item in visibleMenuItems"
          :key="item.to"
          :to="item.to"
          :class="['sidebar-item', { active: item.active }]"
        >
          <span class="text-xl">{{ item.icon }}</span>
          <span v-show="sidebarOpen">{{ item.name }}</span>
        </RouterLink>

        <div class="sidebar-section mt-8" v-show="sidebarOpen">設定</div>
        
        <RouterLink to="/profile" :class="['sidebar-item', { active: route.path === '/profile' }]">
          <span class="text-xl">⚙️</span>
          <span v-show="sidebarOpen">個人設定</span>
        </RouterLink>
      </nav>

      <!-- User Info -->
      <div class="p-4 border-t border-white/10">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-lg font-bold text-white">
            {{ authStore.user?.display_name?.[0] || 'U' }}
          </div>
          <div v-show="sidebarOpen" class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">{{ authStore.user?.display_name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ authStore.user?.role?.display_name }}</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden" :class="sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'">
      <!-- Header -->
      <header class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <!-- Toggle Sidebar -->
            <button 
              @click="sidebarOpen = !sidebarOpen"
              class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <!-- Breadcrumb -->
            <div class="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              <RouterLink to="/" class="hover:text-gray-700">首頁</RouterLink>
              <span>/</span>
              <span class="text-gray-900 font-medium">{{ route.meta.title || '儀表板' }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <!-- Notifications -->
            <button class="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <svg class="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button 
                @click="userMenuOpen = !userMenuOpen"
                class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div class="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                  {{ authStore.user?.display_name?.[0] || 'U' }}
                </div>
                <span class="hidden sm:block text-sm font-medium text-gray-700">
                  {{ authStore.user?.display_name }}
                </span>
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown -->
              <div 
                v-show="userMenuOpen"
                @click="userMenuOpen = false"
                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <RouterLink to="/profile" class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <span>⚙️</span> 個人設定
                </RouterLink>
                <hr class="my-1 border-gray-200" />
                <button 
                  @click="handleLogout"
                  class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                >
                  <span>🚪</span> 登出
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-6">
        <RouterView />
      </main>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <div 
      v-show="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-black/50 z-30 lg:hidden"
    ></div>
  </div>
</template>
