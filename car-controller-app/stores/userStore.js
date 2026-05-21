import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    workerId: '',
    workerName: '',
    role: '',
    token: '',
    isLoggedIn: false,
  }),

  getters: {
    isAdmin: (state) => state.role === 'admin',
    displayName: (state) => state.workerName || state.workerId || '未登录',
  },

  actions: {
    setAuthResult(result) {
      const ok = result?.ok === true || result?.status === 'ok'
      if (!ok) return false

      const worker = result.worker || {}
      this.workerId = worker.worker_no || worker.worker_id || result.worker_no || result.worker_id || ''
      this.workerName = worker.name || worker.worker_name || result.worker_name || ''
      this.role = worker.role || result.role || 'operator'
      this.token = result.token || ''
      this.isLoggedIn = true

      uni.setStorageSync('user_info', {
        workerId: this.workerId,
        workerName: this.workerName,
        role: this.role,
        token: this.token,
      })
      return true
    },

    logout() {
      this.workerId = ''
      this.workerName = ''
      this.role = ''
      this.token = ''
      this.isLoggedIn = false
      uni.removeStorageSync('user_info')
    },

    loadFromStorage() {
      const info = uni.getStorageSync('user_info')
      if (info && info.workerId) {
        this.workerId = info.workerId
        this.workerName = info.workerName || ''
        this.role = info.role || ''
        this.token = info.token || ''
        this.isLoggedIn = true
      }
    },
  },
})
