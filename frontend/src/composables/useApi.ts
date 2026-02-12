import { ref } from 'vue'
import axios, { AxiosError } from 'axios'

export function useApi<T = any>() {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    body?: any
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    loading.value = true
    error.value = null
    
    try {
      const response = await axios({ method, url, data: body })
      data.value = response.data.data
      return { success: true, data: response.data.data }
    } catch (e) {
      const axiosError = e as AxiosError<{ error?: string }>
      const errMsg = axiosError.response?.data?.error || axiosError.message || '發生錯誤'
      error.value = errMsg
      return { success: false, error: errMsg }
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    get: (url: string) => execute('get', url),
    post: (url: string, body?: any) => execute('post', url, body),
    put: (url: string, body?: any) => execute('put', url, body),
    del: (url: string) => execute('delete', url)
  }
}
