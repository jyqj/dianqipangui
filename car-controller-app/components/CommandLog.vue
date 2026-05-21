<template>
  <view class="cmd-log">
    <view v-if="logs.length === 0" class="cmd-empty">
      <text class="cmd-empty-text">暂无命令</text>
    </view>
    <view
      v-for="(logItem, index) in logs"
      :key="index"
      class="cmd-item"
    >
      <view class="cmd-header">
        <text class="cmd-direction" :class="logItem.direction === 'in' ? 'dir-in' : 'dir-out'">
          {{ logItem.direction === 'in' ? '&lt;-' : '-&gt;' }}
        </text>
        <text class="cmd-event">{{ logItem.event }}</text>
        <text class="cmd-time">{{ formatLogTime(logItem.ts) }}</text>
      </view>
      <text v-if="logItem.data" class="cmd-data">{{ truncateData(logItem.data) }}</text>
    </view>
  </view>
</template>

<script setup>
import { formatTime } from '../utils/time'

const props = defineProps({
  logs: {
    type: Array,
    default: () => [],
  },
})

function formatLogTime(ts) {
  return formatTime(ts)
}

function truncateData(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data)
  return str.length > 100 ? str.substring(0, 100) + '...' : str
}
</script>

<style scoped>
.cmd-log {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cmd-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.cmd-empty-text {
  font-size: 28rpx;
  color: #6B7280;
}

.cmd-item {
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  background-color: #1F2937;
}

.cmd-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8rpx;
}

.cmd-direction {
  font-size: 22rpx;
  font-family: 'Courier New', monospace;
  font-weight: bold;
}

.dir-in {
  color: #10B981;
}

.dir-out {
  color: #3B82F6;
}

.cmd-event {
  font-size: 24rpx;
  color: #F9FAFB;
  font-family: 'Courier New', monospace;
}

.cmd-time {
  font-size: 20rpx;
  color: #6B7280;
  margin-left: auto;
}

.cmd-data {
  font-size: 20rpx;
  color: #9CA3AF;
  font-family: 'Courier New', monospace;
  margin-top: 4rpx;
  word-break: break-all;
}
</style>
