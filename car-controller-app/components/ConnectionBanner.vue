<template>
  <view class="banner">
    <view class="banner-item">
      <view class="dot" :class="pcStatusClass"></view>
      <text class="banner-text">PC: {{ pcStatusText }}</text>
    </view>
    <view class="banner-item">
      <view class="dot" :class="bleStatusClass"></view>
      <text class="banner-text">BLE: {{ bleStatusText }}</text>
    </view>
    <view class="banner-item">
      <text class="banner-mode" :class="modeClass">{{ modeText }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useConnectionStore } from '../stores/connectionStore'
import { useCarStore } from '../stores/carStore'

const connStore = useConnectionStore()
const carStore = useCarStore()

const pcStatusText = computed(() => connStore.socketConnected ? '在线' : '离线')
const pcStatusClass = computed(() => connStore.socketConnected ? 'dot-green' : 'dot-red')

const bleStatusText = computed(() => {
  if (connStore.simulateMode) return '模拟模式'
  return connStore.bleConnected ? connStore.bleDeviceName || '已连接' : '未连接'
})
const bleStatusClass = computed(() => {
  if (connStore.simulateMode) return 'dot-blue'
  return connStore.bleConnected ? 'dot-green' : 'dot-red'
})

const modeText = computed(() => carStore.modeLabel)
const modeClass = computed(() => {
  if (carStore.isEstop) return 'mode-danger'
  if (carStore.isFault) return 'mode-warning'
  if (carStore.isAuto) return 'mode-auto'
  return 'mode-manual'
})
</script>

<style scoped>
.banner {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 24rpx;
  background-color: #1F2937;
  border-bottom: 1rpx solid #374151;
}

.banner-item {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.dot-green {
  background-color: #10B981;
  box-shadow: 0 0 6rpx #10B981;
}

.dot-red {
  background-color: #EF4444;
  box-shadow: 0 0 6rpx #EF4444;
}

.dot-blue {
  background-color: #3B82F6;
  box-shadow: 0 0 6rpx #3B82F6;
}

.banner-text {
  font-size: 24rpx;
  color: #D1D5DB;
}

.banner-mode {
  font-size: 24rpx;
  font-weight: bold;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.mode-manual {
  color: #3B82F6;
  background-color: rgba(59, 130, 246, 0.15);
}

.mode-auto {
  color: #10B981;
  background-color: rgba(16, 185, 129, 0.15);
}

.mode-danger {
  color: #EF4444;
  background-color: rgba(239, 68, 68, 0.15);
}

.mode-warning {
  color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.15);
}
</style>
