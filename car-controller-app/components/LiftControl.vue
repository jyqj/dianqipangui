<template>
  <view class="lift-panel">
    <text class="lift-title">推杆控制</text>

    <!-- 上升按钮 -->
    <view
      class="lift-btn lift-btn-up"
      :class="{ 'lift-btn-disabled': disabled }"
      @touchstart.prevent="onUpStart"
      @touchend.prevent="onUpEnd"
      @touchcancel.prevent="onUpEnd"
    >
      <text class="lift-btn-icon">&#9650;</text>
      <text class="lift-btn-text">上升</text>
    </view>

    <!-- 高度显示 -->
    <view class="lift-info">
      <text class="lift-height">高度: {{ heightMm }}mm</text>
      <view class="lift-bar-bg">
        <view class="lift-bar-fill" :style="{ width: heightPct + '%' }"></view>
      </view>
      <text class="lift-pct">{{ heightPct }}%</text>
    </view>

    <!-- 下降按钮 -->
    <view
      class="lift-btn lift-btn-down"
      :class="{ 'lift-btn-disabled': disabled }"
      @touchstart.prevent="onDownStart"
      @touchend.prevent="onDownEnd"
      @touchcancel.prevent="onDownEnd"
    >
      <text class="lift-btn-icon">&#9660;</text>
      <text class="lift-btn-text">下降</text>
    </view>

    <!-- 停止按钮 -->
    <view
      class="lift-btn lift-btn-stop"
      @touchstart.prevent="onStop"
    >
      <text class="lift-btn-icon">&#9632;</text>
      <text class="lift-btn-text">停止</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useCarStore } from '../stores/carStore'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['lift-up', 'lift-down', 'lift-stop'])

const carStore = useCarStore()

const heightMm = computed(() => carStore.estimatedLiftHeightMm)
const heightPct = computed(() => carStore.liftHeightPct)

function onUpStart() {
  if (props.disabled) return
  emit('lift-up')
}

function onUpEnd() {
  if (props.disabled) return
  emit('lift-stop')
}

function onDownStart() {
  if (props.disabled) return
  emit('lift-down')
}

function onDownEnd() {
  if (props.disabled) return
  emit('lift-stop')
}

function onStop() {
  emit('lift-stop')
}
</script>

<style scoped>
.lift-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx;
}

.lift-title {
  font-size: 28rpx;
  color: #D1D5DB;
  font-weight: bold;
  margin-bottom: 8rpx;
}

.lift-btn {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  width: 100%;
  height: 72rpx;
  border-radius: 12rpx;
  background-color: #374151;
}

.lift-btn:active {
  opacity: 0.7;
}

.lift-btn-disabled {
  opacity: 0.4;
}

.lift-btn-up {
  background-color: rgba(59, 130, 246, 0.2);
  border: 1rpx solid #3B82F6;
}

.lift-btn-down {
  background-color: rgba(59, 130, 246, 0.2);
  border: 1rpx solid #3B82F6;
}

.lift-btn-stop {
  background-color: rgba(245, 158, 11, 0.2);
  border: 1rpx solid #F59E0B;
}

.lift-btn-icon {
  font-size: 28rpx;
  color: #F9FAFB;
}

.lift-btn-text {
  font-size: 26rpx;
  color: #F9FAFB;
}

.lift-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8rpx;
  padding: 8rpx 0;
}

.lift-height {
  font-size: 24rpx;
  color: #D1D5DB;
}

.lift-bar-bg {
  width: 100%;
  height: 16rpx;
  background-color: #4B5563;
  border-radius: 8rpx;
  overflow: hidden;
}

.lift-bar-fill {
  height: 100%;
  background-color: #3B82F6;
  border-radius: 8rpx;
  transition: width 0.2s ease;
}

.lift-pct {
  font-size: 22rpx;
  color: #9CA3AF;
}
</style>
