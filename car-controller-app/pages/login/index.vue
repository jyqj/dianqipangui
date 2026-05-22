<template>
  <view class="login-page">
    <view class="login-header">
      <text class="login-title">盘柜转运控制</text>
      <text class="login-subtitle">电气盘柜吊装转运系统</text>
    </view>

    <view class="login-form">
      <view class="form-group">
        <text class="form-label">工号</text>
        <input
          class="form-input"
          v-model="workerId"
          placeholder="请输入工号"
          placeholder-class="form-placeholder"
          type="text"
        />
      </view>

      <view class="form-group">
        <text class="form-label">密码</text>
        <input
          class="form-input"
          v-model="password"
          placeholder="请输入密码"
          placeholder-class="form-placeholder"
          type="password"
        />
      </view>

      <view v-if="errorMsg" class="form-error">
        <text class="error-text">{{ errorMsg }}</text>
      </view>

      <view
        class="login-btn"
        :class="{ 'login-btn-disabled': isLoading }"
        @tap="onLogin"
      >
        <text class="login-btn-text">{{ isLoading ? '连接中...' : '登录' }}</text>
      </view>
    </view>

    <view class="login-footer" @tap="goSettings">
      <text class="footer-text">服务器: {{ serverUrl }}</text>
      <text class="footer-hint">点击修改</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/userStore'
import { useConnectionStore } from '../../stores/connectionStore'
import SocketClient from '../../services/socket/SocketClient'

const userStore = useUserStore()
const connStore = useConnectionStore()

const workerId = ref('')
const password = ref('')
const errorMsg = ref('')
const isLoading = ref(false)

const serverUrl = computed(() => connStore.serverUrl)

onMounted(() => {
  connStore.loadSettings()
  userStore.loadFromStorage()

  // 如果已登录，直接跳转
  if (userStore.isLoggedIn) {
    uni.switchTab({ url: '/pages/main/index' })
    return
  }
})

function onLogin() {
  if (isLoading.value) return

  if (!workerId.value.trim()) {
    errorMsg.value = '请输入工号'
    return
  }
  if (!password.value.trim()) {
    errorMsg.value = '请输入密码'
    return
  }

  errorMsg.value = ''
  isLoading.value = true

  // 1. 连接 Socket.IO
  SocketClient.connect(serverUrl.value)

  // 监听连接结果
  const onConnection = (connected) => {
    if (connected) {
      // 2. 发送认证
      SocketClient.login(workerId.value.trim(), password.value.trim())
    } else {
      failLogin('上位机连接已断开')
    }
  }

  const onAuthResult = (result) => {
    isLoading.value = false
    SocketClient.off('connectionChange', onConnection)
    SocketClient.off('authResult', onAuthResult)
    SocketClient.off('connectError', onConnectError)

    if (result.ok === true || result.status === 'ok') {
      userStore.setAuthResult(result)
      connStore.setSocketConnected(true, SocketClient.getSocketId())
      uni.switchTab({ url: '/pages/main/index' })
    } else {
      errorMsg.value = result.msg || result.message || '认证失败'
    }
  }

  const onConnectError = (msg) => {
    SocketClient.off('connectionChange', onConnection)
    SocketClient.off('connectError', onConnectError)
    SocketClient.off('authResult', onAuthResult)
    failLogin(`连接上位机失败：${msg || '请检查服务器地址'}`)
  }

  SocketClient.on('connectionChange', onConnection)
  SocketClient.on('authResult', onAuthResult)
  SocketClient.on('connectError', onConnectError)

  // 5秒超时
  setTimeout(() => {
    if (isLoading.value) {
      SocketClient.off('connectionChange', onConnection)
      SocketClient.off('authResult', onAuthResult)
      SocketClient.off('connectError', onConnectError)
      failLogin('连接上位机超时，请检查服务器地址和网络')
    }
  }, 5000)
}

function failLogin(message) {
  isLoading.value = false
  errorMsg.value = message
}

function goSettings() {
  uni.navigateTo({ url: '/pages/settings/index' })
}
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 48rpx;
  background-color: #111827;
}

.login-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.login-title {
  font-size: 52rpx;
  font-weight: bold;
  color: #F9FAFB;
  margin-bottom: 16rpx;
}

.login-subtitle {
  font-size: 28rpx;
  color: #9CA3AF;
}

.login-form {
  width: 100%;
  max-width: 600rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #D1D5DB;
  margin-bottom: 12rpx;
}

.form-input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background-color: #374151;
  border: 2rpx solid #4B5563;
  border-radius: 12rpx;
  color: #F9FAFB;
  font-size: 30rpx;
}

.form-placeholder {
  color: #6B7280;
}

.form-error {
  margin-bottom: 24rpx;
}

.error-text {
  font-size: 26rpx;
  color: #EF4444;
}

.login-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 96rpx;
  background-color: #3B82F6;
  border-radius: 12rpx;
  margin-top: 16rpx;
}

.login-btn:active {
  background-color: #2563EB;
}

.login-btn-disabled {
  background-color: #4B5563;
}

.login-btn-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.login-footer {
  position: fixed;
  bottom: 60rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.footer-text {
  font-size: 24rpx;
  color: #6B7280;
}

.footer-hint {
  font-size: 22rpx;
  color: #4B5563;
}
</style>
