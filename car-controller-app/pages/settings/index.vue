<template>
  <view class="settings-page">
    <!-- 连接设置 -->
    <view class="section">
      <text class="section-title">连接设置</text>
      <view class="setting-card">
        <view class="setting-item">
          <text class="setting-label">上位机 IP</text>
          <input
            class="setting-input"
            v-model="serverIp"
            placeholder="192.168.1.100"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
        <view class="setting-item">
          <text class="setting-label">端口</text>
          <input
            class="setting-input setting-input-short"
            v-model="serverPort"
            placeholder="3000"
            placeholder-class="setting-placeholder"
            type="number"
            @blur="onSaveSettings"
          />
        </view>
        <view class="setting-item">
          <text class="setting-label">模拟模式</text>
          <switch
            :checked="simulateMode"
            color="#3B82F6"
            @change="onSimulateModeChange"
          />
        </view>
      </view>
    </view>

    <!-- BLE 设置 -->
    <view class="section">
      <text class="section-title">BLE 设置</text>
      <view class="setting-card">
        <view class="setting-item">
          <text class="setting-label">设备名前缀</text>
          <input
            class="setting-input setting-input-short"
            v-model="bleNamePrefix"
            placeholder="ESP32"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
        <view class="setting-item">
          <text class="setting-label">服务 UUID</text>
          <input
            class="setting-input"
            v-model="bleServiceUuid"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
        <view class="setting-item">
          <text class="setting-label">写入特征 UUID</text>
          <input
            class="setting-input"
            v-model="bleCharWriteUuid"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
        <view class="setting-item">
          <text class="setting-label">通知特征 UUID</text>
          <input
            class="setting-input"
            v-model="bleCharNotifyUuid"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
      </view>
    </view>

    <!-- 性能设置 -->
    <view class="section">
      <text class="section-title">性能设置</text>
      <view class="setting-card">
        <view class="setting-item">
          <text class="setting-label">遥测上报频率 (ms)</text>
          <input
            class="setting-input setting-input-short"
            v-model="telemetryInterval"
            type="number"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
        <view class="setting-item">
          <text class="setting-label">摇杆发送频率 (ms)</text>
          <input
            class="setting-input setting-input-short"
            v-model="joystickInterval"
            type="number"
            placeholder-class="setting-placeholder"
            @blur="onSaveSettings"
          />
        </view>
      </view>
    </view>

    <!-- 用户信息 -->
    <view class="section">
      <text class="section-title">用户信息</text>
      <view class="setting-card">
        <view class="setting-item">
          <text class="setting-label">工号</text>
          <text class="setting-value">{{ userStore.workerId || '-' }}</text>
        </view>
        <view class="setting-item">
          <text class="setting-label">姓名</text>
          <text class="setting-value">{{ userStore.workerName || '-' }}</text>
        </view>
        <view class="setting-item">
          <text class="setting-label">角色</text>
          <text class="setting-value">{{ userStore.role || '-' }}</text>
        </view>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-btn" @tap="onLogout">
      <text class="logout-text">退出登录</text>
    </view>

    <!-- 版本号（点击5次进入调试页） -->
    <view class="version-area" @tap="onVersionTap">
      <text class="version-text">版本 1.0.0</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useConnectionStore } from '../../stores/connectionStore'
import { useUserStore } from '../../stores/userStore'
import SocketClient from '../../services/socket/SocketClient'

const connStore = useConnectionStore()
const userStore = useUserStore()

const serverIp = ref('')
const serverPort = ref('')
const simulateMode = ref(true)
const bleNamePrefix = ref('')
const bleServiceUuid = ref('')
const bleCharWriteUuid = ref('')
const bleCharNotifyUuid = ref('')
const telemetryInterval = ref('')
const joystickInterval = ref('')

let versionTapCount = 0
let versionTapTimer = null

onMounted(() => {
  loadCurrentSettings()
})

function loadCurrentSettings() {
  serverIp.value = connStore.serverIp
  serverPort.value = String(connStore.serverPort)
  simulateMode.value = connStore.simulateMode
  bleNamePrefix.value = connStore.bleNamePrefix
  bleServiceUuid.value = connStore.bleServiceUuid
  bleCharWriteUuid.value = connStore.bleCharWriteUuid
  bleCharNotifyUuid.value = connStore.bleCharNotifyUuid
  telemetryInterval.value = String(connStore.telemetryInterval)
  joystickInterval.value = String(connStore.joystickInterval)
}

function onSaveSettings() {
  connStore.updateSettings({
    serverIp: serverIp.value,
    serverPort: parseInt(serverPort.value) || 3000,
    bleNamePrefix: bleNamePrefix.value,
    bleServiceUuid: bleServiceUuid.value,
    bleCharWriteUuid: bleCharWriteUuid.value,
    bleCharNotifyUuid: bleCharNotifyUuid.value,
    telemetryInterval: parseInt(telemetryInterval.value) || 500,
    joystickInterval: parseInt(joystickInterval.value) || 100,
    simulateMode: simulateMode.value,
  })
  uni.showToast({ title: '设置已保存', icon: 'success', duration: 1000 })
}

function onSimulateModeChange(e) {
  simulateMode.value = e.detail.value
  onSaveSettings()
}

function onLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        SocketClient.disconnect()
        uni.reLaunch({ url: '/pages/login/index' })
      }
    },
  })
}

function onVersionTap() {
  versionTapCount++
  if (versionTapTimer) clearTimeout(versionTapTimer)

  if (versionTapCount >= 5) {
    versionTapCount = 0
    uni.navigateTo({ url: '/pages/debug/index' })
  } else {
    versionTapTimer = setTimeout(() => {
      versionTapCount = 0
    }, 3000)
  }
}
</script>

<style scoped>
.settings-page {
  min-height: 100vh;
  background-color: #111827;
  padding: 24rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #9CA3AF;
  margin-bottom: 12rpx;
  text-transform: uppercase;
}

.setting-card {
  background-color: #1F2937;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.setting-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  border-bottom: 1rpx solid #374151;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 28rpx;
  color: #D1D5DB;
  flex-shrink: 0;
}

.setting-input {
  text-align: right;
  font-size: 28rpx;
  color: #F9FAFB;
  flex: 1;
  margin-left: 24rpx;
}

.setting-input-short {
  max-width: 200rpx;
}

.setting-placeholder {
  color: #6B7280;
}

.setting-value {
  font-size: 28rpx;
  color: #6B7280;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background-color: rgba(239, 68, 68, 0.15);
  border: 1rpx solid rgba(239, 68, 68, 0.3);
  border-radius: 16rpx;
  margin-top: 48rpx;
}

.logout-btn:active {
  background-color: rgba(239, 68, 68, 0.25);
}

.logout-text {
  font-size: 30rpx;
  color: #EF4444;
}

.version-area {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 48rpx;
  padding: 24rpx;
}

.version-text {
  font-size: 24rpx;
  color: #4B5563;
}
</style>
