<template>
  <view class="alarm-list">
    <view v-if="alarms.length === 0" class="alarm-empty">
      <text class="alarm-empty-text">暂无报警</text>
    </view>
    <view
      v-for="alarm in alarms"
      :key="alarm.id"
      class="alarm-item"
      :class="levelClass(alarm.level)"
    >
      <view class="alarm-header">
        <view class="alarm-level-badge" :class="'badge-' + alarm.level">
          <text class="badge-text">{{ levelLabel(alarm.level) }}</text>
        </view>
        <text class="alarm-code">{{ alarm.code }}</text>
        <text class="alarm-time">{{ formatAlarmTime(alarm.ts) }}</text>
      </view>
      <text class="alarm-message">{{ alarm.message }}</text>
    </view>
  </view>
</template>

<script setup>
import { formatTime } from '../utils/time'

const props = defineProps({
  alarms: {
    type: Array,
    default: () => [],
  },
})

function levelClass(level) {
  return `alarm-${level}`
}

function levelLabel(level) {
  const labels = {
    critical: '严重',
    warning: '警告',
    info: '信息',
  }
  return labels[level] || level
}

function formatAlarmTime(ts) {
  return formatTime(ts)
}
</script>

<style scoped>
.alarm-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.alarm-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.alarm-empty-text {
  font-size: 28rpx;
  color: #6B7280;
}

.alarm-item {
  padding: 16rpx;
  border-radius: 12rpx;
  background-color: #1F2937;
  border-left: 6rpx solid transparent;
}

.alarm-critical {
  border-left-color: #EF4444;
  background-color: rgba(239, 68, 68, 0.08);
}

.alarm-warning {
  border-left-color: #F59E0B;
  background-color: rgba(245, 158, 11, 0.08);
}

.alarm-info {
  border-left-color: #3B82F6;
  background-color: rgba(59, 130, 246, 0.08);
}

.alarm-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.alarm-level-badge {
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
}

.badge-critical {
  background-color: rgba(239, 68, 68, 0.2);
}

.badge-warning {
  background-color: rgba(245, 158, 11, 0.2);
}

.badge-info {
  background-color: rgba(59, 130, 246, 0.2);
}

.badge-text {
  font-size: 20rpx;
  color: #F9FAFB;
}

.alarm-code {
  font-size: 22rpx;
  color: #9CA3AF;
  font-family: 'Courier New', monospace;
}

.alarm-time {
  font-size: 22rpx;
  color: #6B7280;
  margin-left: auto;
}

.alarm-message {
  font-size: 26rpx;
  color: #D1D5DB;
}
</style>
