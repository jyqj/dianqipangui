<template>
  <view class="telemetry-panel">
    <view class="telem-row">
      <view class="telem-item">
        <text class="telem-label">位置</text>
        <text class="telem-value">{{ posText }}</text>
      </view>
      <view class="telem-item">
        <text class="telem-label">朝向</text>
        <text class="telem-value">{{ carStore.estimatedHeading }}°</text>
      </view>
    </view>
    <view class="telem-row">
      <view class="telem-item">
        <text class="telem-label">电池</text>
        <text class="telem-value" :class="batteryClass">{{ carStore.batteryV }}V ({{ carStore.batteryPct }}%)</text>
      </view>
      <view class="telem-item">
        <text class="telem-label">障碍物</text>
        <text class="telem-value" :class="obstacleClass">{{ carStore.obstacleCm }}cm</text>
      </view>
    </view>
    <view class="telem-row">
      <view class="telem-item">
        <text class="telem-label">运动</text>
        <text class="telem-value">{{ carStore.moveStateLabel }}</text>
      </view>
      <view class="telem-item">
        <text class="telem-label">推杆</text>
        <text class="telem-value">{{ carStore.estimatedLiftHeightMm }}mm</text>
      </view>
    </view>
    <view v-if="carStore.isTracing" class="telem-row">
      <view class="telem-item telem-item-full">
        <text class="telem-label">循迹进度</text>
        <view class="progress-bar-bg">
          <view class="progress-bar-fill" :style="{ width: carStore.progressPct + '%' }"></view>
        </view>
        <text class="telem-value">{{ carStore.progressPct }}%</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useCarStore } from '../stores/carStore'

const carStore = useCarStore()

const posText = computed(() => {
  return `(${carStore.estimatedPos.x}, ${carStore.estimatedPos.y})`
})

const batteryClass = computed(() => {
  const level = carStore.batteryLevel
  if (level === 'low') return 'text-danger'
  if (level === 'medium') return 'text-warning'
  return 'text-success'
})

const obstacleClass = computed(() => {
  if (carStore.obstacleCm < 30) return 'text-danger'
  if (carStore.obstacleCm < 60) return 'text-warning'
  return ''
})
</script>

<style scoped>
.telemetry-panel {
  padding: 16rpx;
  background-color: #1F2937;
  border-radius: 12rpx;
}

.telem-row {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.telem-row:last-child {
  margin-bottom: 0;
}

.telem-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.telem-item-full {
  flex: none;
  width: 100%;
}

.telem-label {
  font-size: 22rpx;
  color: #9CA3AF;
}

.telem-value {
  font-size: 26rpx;
  color: #F9FAFB;
  font-family: 'Courier New', monospace;
}

.text-success {
  color: #10B981;
}

.text-warning {
  color: #F59E0B;
}

.text-danger {
  color: #EF4444;
}

.progress-bar-bg {
  width: 100%;
  height: 12rpx;
  background-color: #4B5563;
  border-radius: 6rpx;
  overflow: hidden;
  margin: 4rpx 0;
}

.progress-bar-fill {
  height: 100%;
  background-color: #10B981;
  border-radius: 6rpx;
  transition: width 0.3s ease;
}
</style>
