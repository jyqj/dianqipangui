<template>
  <view class="estop-wrapper">
    <view
      class="estop-btn"
      :class="{ 'estop-active': isEstop }"
      @tap="onEstop"
    >
      <text class="estop-icon">&#9899;</text>
      <text class="estop-text">{{ isEstop ? '已急停 - 点击复位' : '急    停' }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useCarStore } from '../stores/carStore'

const carStore = useCarStore()

const emit = defineEmits(['estop', 'reset'])

const isEstop = computed(() => carStore.isEstop)

function onEstop() {
  if (isEstop.value) {
    emit('reset')
  } else {
    // 触发手机震动
    try {
      uni.vibrateLong({
        success: () => {},
        fail: () => {},
      })
    } catch (err) {
      // 部分平台不支持
    }
    emit('estop')
  }
}
</script>

<style scoped>
.estop-wrapper {
  padding: 16rpx 24rpx;
}

.estop-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  width: 100%;
  height: 120rpx;
  border-radius: 16rpx;
  background-color: #EF4444;
  border: 4rpx solid #DC2626;
  box-shadow: 0 4rpx 16rpx rgba(239, 68, 68, 0.4);
}

.estop-btn:active {
  background-color: #DC2626;
  transform: scale(0.98);
}

.estop-active {
  background-color: #92400E;
  border-color: #F59E0B;
  box-shadow: 0 4rpx 16rpx rgba(245, 158, 11, 0.4);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.estop-icon {
  font-size: 40rpx;
  color: #FFFFFF;
}

.estop-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
  letter-spacing: 8rpx;
}
</style>
