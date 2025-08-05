import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { API_CONFIG, API_ENDPOINTS, STORAGE_KEYS, MESSAGES, API_BASE_URL } from '@/utils/constants'
import toast from 'react-hot-toast'

class ApiService {
  private api: AxiosInstance
  private isRefreshing = false
  private failedQueue: Array<{
    resolve: (value?: any) => void
    reject: (error?: any) => void
  }> = []

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupRequestInterceptor()
    this.setupResponseInterceptor()
  }

  private setupRequestInterceptor() {
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )
  }

  private setupResponseInterceptor() {
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject })
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`
              }
              return this.api(originalRequest)
            }).catch(err => Promise.reject(err))
          }

          originalRequest._retry = true
          this.isRefreshing = true

          try {
            const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
            if (!refreshToken) {
              throw new Error('No refresh token')
            }

            const response = await this.api.post(API_ENDPOINTS.AUTH.REFRESH, {
              refresh_token: refreshToken
            })

            const { access_token } = response.data
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token)

            this.processQueue(null, access_token)

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`
            }
            return this.api(originalRequest)
          } catch (refreshError) {
            this.processQueue(refreshError, null)
            this.clearAuthData()
            window.location.href = '/login'
            return Promise.reject(refreshError)
          } finally {
            this.isRefreshing = false
          }
        }

        return Promise.reject(error)
      }
    )
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token)
      }
    })
    this.failedQueue = []
  }

  private clearAuthData() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER_DATA)
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.get<T>(url, config)
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.post<T>(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.put<T>(url, data, config)
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.patch<T>(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.api.delete<T>(url, config)
  }

  // File upload
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.api.post<T>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }

  // Download file
  async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await this.api.get(url, {
      responseType: 'blob',
    })

    const blob = new Blob([response.data])
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = filename || 'download'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
  }

  // Health check
  async healthCheck(): Promise<AxiosResponse> {
    return this.get('/health')
  }

  // Get API instance for advanced usage
  getAxiosInstance(): AxiosInstance {
    return this.api
  }
}

export default new ApiService()