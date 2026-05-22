<template>
  <view class="debug-page">
    <!-- 系统信息 -->
    <view class="section">
      <text class="section-title">系统信息</text>
      <view class="debug-card">
        <view class="debug-row">
          <text class="debug-label">Socket ID</text>
          <text class="debug-value">{{ connStore.socketId || '-' }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-label">Worker ID</text>
          <text class="debug-value">{{ userStore.workerId || '-' }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-label">当前工单</text>
          <text class="debug-value">{{ orderStore.currentOrder?.id || '-' }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-label">App 模式</text>
          <text class="debug-value">{{ carStore.modeLabel }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-label">控制权</text>
          <text class="debug-value">{{ arbiterOwner }}</text>
        </view>
        <view class="debug-row">
          <text class="debug-label">待处理命令</text>
          <text class="debug-value">{{ orderStore.pendingCmds.length }}</text>
        </view>
      </view>
    </view>

    <!-- 日志切换 -->
    <view class="tab-bar">
      <view
        class="tab-item"
        :class="{ 'tab-active': currentTab === 'socket' }"
        @tap="currentTab = 'socket'"
      >
        <text class="tab-text">Socket.IO 日志</text>
      </view>
      <view
        class="tab-item"
        :class="{ 'tab-active': currentTab === 'car' }"
        @tap="currentTab = 'car'"
      >
        <text class="tab-text">Car 指令日志</text>
      </view>
    </view>

    <!-- 刷新按钮 -->
    <view class="refresh-bar">
      <view class="refresh-btn" @tap="refreshLogs">
        <text class="refresh-text">刷新</text>
      </view>
      <view class="refresh-btn" @tap="clearAllLogs">
        <text class="refresh-text">清空</text>
      </view>
    </view>

    <!-- 日志列表 -->
    <scroll-view scroll-y class="log-scroll">
      <CommandLog :logs="currentLogs" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import CommandLog from '../../components/CommandLog.vue'
import { useConnectionStore } from '../../stores/connectionStore'
import { useUserStore } from '../../stores/userStore'
import { useOrderStore } from '../../stores/orderStore'
import { useCarStore } from '../../stores/carStore'
import CommandArbiter from '../../services/bridge/CommandArbiter'
import { getSocketLogs, getCarLogs, clearLogs } from '../../utils/logger'

const connStore = useConnectionStore()
const userStore = useUserStore()
const orderStore = useOrderStore()
const carStore = useCarStore()

const currentTab = ref('socket')
const socketLogs = ref([])
const carLogs = ref([])

const arbiterOwner = computed(() => CommandArbiter.getOwnerLabel())

const currentLogs = computed(() => {
  return currentTab.value === 'socket' ? socketLogs.value : carLogs.value
})

onMounted(() => {
  refreshLogs()
})

function refreshLogs() {
  socketLogs.value = getSocketLogs().reverse()
  carLogs.value = getCarLogs().reverse()
}

function clearAllLogs() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有日志吗？',
    success: (res) => {
      if (res.confirm) {
        clearLogs()
        refreshLogs()
      }
    },
  })
}
</script>

<style scoped>
.debug-page {
  min-height: 100vh;
  background-color: #111827;
  display: flex;
  flex-direction: column;
}

.section {
  padding: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #9CA3AF;
  margin-bottom: 12rpx;
}

.debug-card {
  background-color: #1F2937;
  border-radius: 12rpx;
  padding: 16rpx;
}

.debug-row {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
  border-bottom: 1rpx solid #374151;
}

.debug-row:last-child {
  border-bottom: none;
}

.debug-label {
  font-size: 24rpx;
  color: #9CA3AF;
}

.debug-value {
  font-size: 24rpx;
  color: #F9FAFB;
  font-family: 'Courier New', monospace;
}

.tab-bar {
  display: flex;
  flex-direction: row;
  border-bottom: 1rpx solid #374151;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
}

.tab-active {
  border-bottom: 4rpx solid #3B82F6;
}

.tab-text {
  font-size: 26rpx;
  color: #D1D5DB;
}

.refresh-bar {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  padding: 12rpx 24rpx;
}

.refresh-btn {
  padding: 8rpx 24rpx;
  background-color: #374151;
  border-radius: 8rpx;
}

.refresh-text {
  font-size: 24rpx;
  color: #D1D5DB;
}

.log-scroll {
  flex: 1;
  padding: 0 24rpx 24rpx;
}
</style>
