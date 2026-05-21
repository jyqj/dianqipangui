<template>
  <view class="alarms-page">
    <!-- 顶部操作栏 -->
    <view class="top-bar">
      <text class="alarm-count">共 {{ alarmStore.alarms.length }} 条</text>
      <view class="top-actions">
        <view v-if="alarmStore.hasUnread" class="top-btn" @tap="onMarkAllRead">
          <text class="top-btn-text">全部已读</text>
        </view>
        <view v-if="alarmStore.alarms.length > 0" class="top-btn top-btn-danger" @tap="onClear">
          <text class="top-btn-text">清空</text>
        </view>
      </view>
    </view>

    <!-- 筛选标签 -->
    <view class="filter-bar">
      <view
        v-for="f in filters"
        :key="f.value"
        class="filter-tag"
        :class="{ 'filter-active': currentFilter === f.value }"
        @tap="currentFilter = f.value"
      >
        <text class="filter-text">{{ f.label }}</text>
      </view>
    </view>

    <!-- 报警列表 -->
    <scroll-view scroll-y class="alarm-scroll">
      <AlarmList :alarms="filteredAlarms" />
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import AlarmList from '../../components/AlarmList.vue'
import { useAlarmStore } from '../../stores/alarmStore'

const alarmStore = useAlarmStore()

const currentFilter = ref('all')

const filters = [
  { label: '全部', value: 'all' },
  { label: '严重', value: 'critical' },
  { label: '警告', value: 'warning' },
  { label: '信息', value: 'info' },
]

const filteredAlarms = computed(() => {
  if (currentFilter.value === 'all') return alarmStore.alarms
  return alarmStore.alarms.filter(a => a.level === currentFilter.value)
})

onMounted(() => {
  // 进入报警页面时标记为已读
  alarmStore.markAllRead()
})

function onMarkAllRead() {
  alarmStore.markAllRead()
}

function onClear() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有报警记录吗？',
    success: (res) => {
      if (res.confirm) {
        alarmStore.clearAlarms()
      }
    },
  })
}
</script>

<style scoped>
.alarms-page {
  min-height: 100vh;
  background-color: #111827;
  display: flex;
  flex-direction: column;
}

.top-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  border-bottom: 1rpx solid #374151;
}

.alarm-count {
  font-size: 26rpx;
  color: #9CA3AF;
}

.top-actions {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
}

.top-btn {
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  background-color: #374151;
}

.top-btn-danger {
  background-color: rgba(239, 68, 68, 0.2);
}

.top-btn-text {
  font-size: 24rpx;
  color: #D1D5DB;
}

.filter-bar {
  display: flex;
  flex-direction: row;
  gap: 12rpx;
  padding: 16rpx 24rpx;
}

.filter-tag {
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  background-color: #374151;
}

.filter-active {
  background-color: rgba(59, 130, 246, 0.2);
  border: 1rpx solid #3B82F6;
}

.filter-text {
  font-size: 24rpx;
  color: #D1D5DB;
}

.alarm-scroll {
  flex: 1;
  padding: 0 24rpx 24rpx;
}
</style>
