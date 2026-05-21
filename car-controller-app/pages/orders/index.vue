<template>
  <view class="orders-page">
    <!-- 当前工单 -->
    <view class="section">
      <text class="section-title">当前工单</text>
      <view v-if="orderStore.currentOrder" class="current-order-card">
        <view class="order-header">
          <text class="order-id">{{ orderStore.currentOrder.id }}</text>
          <view class="order-status-badge" :class="'status-' + orderStore.currentOrder.status">
            <text class="status-text">{{ orderStore.currentOrderStatusLabel }}</text>
          </view>
        </view>

        <view class="order-info">
          <view class="info-row">
            <text class="info-label">类型:</text>
            <text class="info-value">{{ orderStore.currentOrder.type || '转运' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">起点:</text>
            <text class="info-value">{{ orderStore.currentOrder.from || '-' }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">终点:</text>
            <text class="info-value">{{ orderStore.currentOrder.to || '-' }}</text>
          </view>
        </view>

        <!-- 进度条 -->
        <view v-if="orderStore.currentOrder.status === 'executing'" class="order-progress">
          <view class="progress-bar-bg">
            <view
              class="progress-bar-fill"
              :style="{ width: orderStore.currentOrder.progressPct + '%' }"
            ></view>
          </view>
          <text class="progress-text">{{ orderStore.currentOrder.progressPct }}%</text>
        </view>

        <!-- 操作按钮 -->
        <view class="order-actions">
          <view
            v-if="orderStore.currentOrder.status === 'executing'"
            class="action-btn action-pause"
            @tap="onPause"
          >
            <text class="action-text">暂停</text>
          </view>
          <view
            v-if="orderStore.currentOrder.status === 'paused'"
            class="action-btn action-resume"
            @tap="onResume"
          >
            <text class="action-text">继续</text>
          </view>
          <view
            v-if="['executing', 'paused', 'pending'].includes(orderStore.currentOrder.status)"
            class="action-btn action-cancel"
            @tap="onCancel"
          >
            <text class="action-text">取消</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-card">
        <text class="empty-text">暂无活动工单</text>
        <text class="empty-hint">工单由上位机下发</text>
      </view>
    </view>

    <!-- 最近工单 -->
    <view class="section">
      <text class="section-title">最近工单</text>
      <view v-if="orderStore.recentOrders.length === 0" class="empty-card">
        <text class="empty-text">暂无历史工单</text>
      </view>
      <view
        v-for="order in orderStore.recentOrders"
        :key="order.id"
        class="history-card"
      >
        <view class="order-header">
          <text class="order-id">{{ order.id }}</text>
          <view class="order-status-badge" :class="'status-' + order.status">
            <text class="status-text">{{ statusLabel(order.status) }}</text>
          </view>
        </view>
        <view class="info-row">
          <text class="info-label">{{ order.from || '-' }} → {{ order.to || '-' }}</text>
          <text class="info-value info-time">{{ formatOrderTime(order.completedAt) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useOrderStore } from '../../stores/orderStore'
import { useCarStore } from '../../stores/carStore'
import SocketClient from '../../services/socket/SocketClient'
import { formatDate } from '../../utils/time'

const orderStore = useOrderStore()
const carStore = useCarStore()

function statusLabel(status) {
  const labels = {
    pending: '待执行',
    executing: '执行中',
    paused: '已暂停',
    completed: '已完成',
    cancelled: '已取消',
  }
  return labels[status] || status
}

function formatOrderTime(ts) {
  if (!ts) return '-'
  return formatDate(ts)
}

function onPause() {
  orderStore.pauseOrder()
  SocketClient.sendOrderEvent({
    event_type: 'paused',
    status: 'paused',
    order_id: orderStore.currentOrder?.id,
    message: 'App 操作员暂停工单',
    ts: Date.now(),
  })
}

function onResume() {
  orderStore.resumeOrder()
  SocketClient.sendOrderEvent({
    event_type: 'resumed',
    status: 'running',
    order_id: orderStore.currentOrder?.id,
    message: 'App 操作员继续工单',
    ts: Date.now(),
  })
}

function onCancel() {
  uni.showModal({
    title: '确认取消',
    content: '确定要取消当前工单吗？',
    success: (res) => {
      if (res.confirm) {
        const orderId = orderStore.currentOrder?.id
        orderStore.cancelOrder()
        SocketClient.sendOrderEvent({
          event_type: 'cancelled',
          status: 'cancelled',
          order_id: orderId,
          message: 'App 操作员取消工单',
          ts: Date.now(),
        })
      }
    },
  })
}
</script>

<style scoped>
.orders-page {
  min-height: 100vh;
  background-color: #111827;
  padding: 24rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #F9FAFB;
  margin-bottom: 16rpx;
}

.current-order-card {
  background-color: #1F2937;
  border-radius: 16rpx;
  padding: 24rpx;
  border: 2rpx solid #374151;
}

.empty-card {
  background-color: #1F2937;
  border-radius: 16rpx;
  padding: 48rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #6B7280;
}

.empty-hint {
  font-size: 24rpx;
  color: #4B5563;
}

.order-header {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.order-id {
  font-size: 30rpx;
  font-weight: bold;
  color: #F9FAFB;
  font-family: 'Courier New', monospace;
}

.order-status-badge {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.status-pending {
  background-color: rgba(107, 114, 128, 0.2);
}

.status-executing {
  background-color: rgba(59, 130, 246, 0.2);
}

.status-paused {
  background-color: rgba(245, 158, 11, 0.2);
}

.status-completed {
  background-color: rgba(16, 185, 129, 0.2);
}

.status-cancelled {
  background-color: rgba(239, 68, 68, 0.2);
}

.status-text {
  font-size: 24rpx;
  color: #D1D5DB;
}

.order-info {
  margin-bottom: 16rpx;
}

.info-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.info-label {
  font-size: 26rpx;
  color: #9CA3AF;
}

.info-value {
  font-size: 26rpx;
  color: #D1D5DB;
}

.info-time {
  font-size: 22rpx;
  color: #6B7280;
}

.order-progress {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.progress-bar-bg {
  flex: 1;
  height: 16rpx;
  background-color: #4B5563;
  border-radius: 8rpx;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background-color: #3B82F6;
  border-radius: 8rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 24rpx;
  color: #D1D5DB;
  min-width: 60rpx;
  text-align: right;
}

.order-actions {
  display: flex;
  flex-direction: row;
  gap: 16rpx;
  margin-top: 16rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  border-radius: 12rpx;
}

.action-pause {
  background-color: rgba(245, 158, 11, 0.2);
  border: 1rpx solid #F59E0B;
}

.action-resume {
  background-color: rgba(16, 185, 129, 0.2);
  border: 1rpx solid #10B981;
}

.action-cancel {
  background-color: rgba(239, 68, 68, 0.2);
  border: 1rpx solid #EF4444;
}

.action-text {
  font-size: 28rpx;
  color: #F9FAFB;
}

.history-card {
  background-color: #1F2937;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}
</style>
