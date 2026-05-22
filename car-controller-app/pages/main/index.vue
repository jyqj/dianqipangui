<template>
  <view class="main-page">
    <!-- 自定义导航栏（navigationStyle: custom） -->
    <view class="custom-nav" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <text class="nav-title">控制</text>
        <view class="nav-battery">
          <text class="battery-text" :class="'battery-' + carStore.batteryLevel">
            {{ carStore.batteryPct }}%
          </text>
        </view>
      </view>
    </view>

    <view class="main-content" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
      <!-- 连接状态横幅 -->
      <ConnectionBanner />

      <!-- 工单状态栏 -->
      <view class="order-bar" v-if="orderStore.hasActiveOrder">
        <text class="order-text">
          工单：{{ orderStore.currentOrder.id }} {{ orderStore.currentOrderStatusLabel }}
          {{ orderStore.currentOrder.progressPct }}%
        </text>
      </view>
      <view class="order-bar" v-else>
        <text class="order-text order-text-idle">无活动工单</text>
      </view>

      <!-- 控制权 -->
      <view class="arbiter-bar">
        <text class="arbiter-text">控制权：{{ arbiterLabel }}</text>
      </view>

      <!-- 摇杆 + 推杆区域 -->
      <view class="control-area">
        <view class="joystick-area">
          <Joystick
            :disabled="isLocked"
            :size="joystickSize"
            @move="onJoystickMove"
          />
        </view>
        <view class="lift-area">
          <LiftControl
            :disabled="isLocked"
            @lift-up="onLiftUp"
            @lift-down="onLiftDown"
            @lift-stop="onLiftStop"
          />
        </view>
      </view>

      <!-- 速度档位 -->
      <view class="gear-bar">
        <text class="gear-label">速度:</text>
        <view
          v-for="gear in [1, 2, 3]"
          :key="gear"
          class="gear-btn"
          :class="{ 'gear-active': carStore.speedGear === gear }"
          @tap="onSetGear(gear)"
        >
          <text class="gear-text">{{ gear }}档</text>
        </view>
      </view>

      <!-- 急停按钮 -->
      <EstopButton @estop="onEstop" @reset="onReset" />

      <!-- 底部遥测面板 -->
      <view class="bottom-panel">
        <TelemetryPanel />
      </view>

      <!-- 底部状态行 -->
      <view class="status-bar">
        <text class="status-text">
          报警：{{ alarmStore.latestAlarm ? alarmStore.latestAlarm.message : '无' }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import ConnectionBanner from '../../components/ConnectionBanner.vue'
import Joystick from '../../components/Joystick.vue'
import LiftControl from '../../components/LiftControl.vue'
import EstopButton from '../../components/EstopButton.vue'
import TelemetryPanel from '../../components/TelemetryPanel.vue'
import { useCarStore } from '../../stores/carStore'
import { useConnectionStore } from '../../stores/connectionStore'
import { useOrderStore } from '../../stores/orderStore'
import { useAlarmStore } from '../../stores/alarmStore'
import { useUserStore } from '../../stores/userStore'
import BleCarTransport from '../../services/car/BleCarTransport'
import SocketClient from '../../services/socket/SocketClient'
import CommandArbiter from '../../services/bridge/CommandArbiter'
import CommandMapper from '../../services/bridge/CommandMapper'
import { generateCmdId } from '../../utils/id'

const carStore = useCarStore()
const connStore = useConnectionStore()
const orderStore = useOrderStore()
const alarmStore = useAlarmStore()
const userStore = useUserStore()

const statusBarHeight = ref(20)
const joystickSize = ref(160)

let carTransport = null
let bridgeStateTimer = null
let activeOrderCommandId = null

const isLocked = computed(() => CommandArbiter.isLocked())
const arbiterLabel = computed(() => CommandArbiter.getOwnerLabel())

onMounted(() => {
  // 获取状态栏高度
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20

  // 计算摇杆尺寸
  const screenWidth = sysInfo.windowWidth
  joystickSize.value = Math.min(Math.floor(screenWidth * 0.45), 200)

  // 检查登录状态
  if (!userStore.isLoggedIn) {
    uni.redirectTo({ url: '/pages/login/index' })
    return
  }

  initTransport()
  initSocketListeners()
  startBridgeStateReport()
})

onUnmounted(() => {
  cleanup()
})

function initTransport() {
  carTransport = new BleCarTransport({
    namePrefix: connStore.bleNamePrefix,
    serviceId: connStore.bleServiceUuid,
    charWriteId: connStore.bleCharWriteUuid,
    charNotifyId: connStore.bleCharNotifyUuid,
  })

  // 注册回调
  carTransport.onStatus((frame) => {
    carStore.updateFromTelemetry(frame)
    if (orderStore.currentOrder) {
      orderStore.updateProgress(frame.progressPct ?? frame.progress_pct ?? 0)
    }
    // 上报遥测到上位机
    if (SocketClient.connected) {
      SocketClient.sendTelemetry(frame)
    }
  })

  carTransport.onAlarm((alarm) => {
    alarmStore.addAlarm(alarm)
    if (SocketClient.connected) {
      SocketClient.sendAlarm(alarm)
    }
  })

  carTransport.onOrderDone((result) => {
    const finishedOrder = orderStore.currentOrder
    const orderId = result.order_id || result.orderId || finishedOrder?.id
    if (activeOrderCommandId && SocketClient.connected) {
      SocketClient.sendCmdAck({
        cmd_id: activeOrderCommandId,
        stage: 'done',
        ok: result.success !== false,
        msg: result.success === false ? (result.error || '执行失败') : '工单执行完成',
      })
    }
    orderStore.completeOrder()
    activeOrderCommandId = null
    if (SocketClient.connected && orderId) {
      SocketClient.sendOrderEvent({
        event_type: 'completed',
        status: 'completed',
        order_id: orderId,
        message: 'App 收到小车执行完成事件',
        result,
        ts: Date.now(),
      })
    }
  })

  // 连接
  carTransport.connect().then(() => {
    connStore.setBleConnected(true, carTransport.getDeviceInfo?.())
    if (SocketClient.connected) {
      SocketClient.sendHello('1.0.0', Number(userStore.workerId) || undefined)
    }
  }).catch((err) => {
    connStore.setLastError(err.message)
    uni.showToast({ title: '小车连接失败: ' + err.message, icon: 'none' })
  })
}

function initSocketListeners() {
  SocketClient.on('command', handlePcCommand)
  SocketClient.on('connectionChange', handleConnectionChange)
}

function handleConnectionChange(connected) {
  connStore.setSocketConnected(connected, SocketClient.getSocketId())
}

function assignOrderFromCommand(data) {
  const payload = data.payload || {}
  const orderId = payload.order_id || data.order_id
  if (!orderId) return
  orderStore.assignOrder({
    id: orderId,
    order_no: payload.order_no,
    title: payload.title,
    target_x: payload.target_x,
    target_y: payload.target_y,
    target_node: payload.target_node,
  })
  orderStore.startOrder()
  activeOrderCommandId = data.cmd_id
  uni.showToast({ title: `收到工单: ${payload.order_no || orderId}`, icon: 'none' })
}

function handlePcCommand(data) {
  const cmdId = data.cmd_id || data.id
  const arbiterResult = CommandArbiter.handlePcCommand(data)

  if (!arbiterResult.accepted) {
    SocketClient.sendCmdAck({
      cmd_id: cmdId,
      stage: 'app_ack',
      ok: false,
      msg: arbiterResult.reason || 'App 拒绝命令',
    })
    return
  }

  SocketClient.sendCmdAck({
    cmd_id: cmdId,
    stage: 'app_ack',
    ok: true,
    msg: 'App 已接收命令',
  })

  if (data.type === 'order_start') {
    assignOrderFromCommand(data)
  }

  if (data.type === 'takeover') {
    uni.showToast({ title: '上位机已接管控制', icon: 'none' })
  }

  const carCmd = CommandMapper.mapCommand(data)
  if (!carCmd) {
    SocketClient.sendCmdAck({
      cmd_id: cmdId,
      stage: 'car_ack',
      ok: true,
      msg: '命令已由 App 仲裁器处理',
    })
    return
  }

  if (!carTransport) {
    SocketClient.sendCmdAck({
      cmd_id: cmdId,
      stage: 'car_ack',
      ok: false,
      msg: '小车传输层未初始化',
    })
    return
  }

  carTransport.sendCommand(carCmd).then((res) => {
    if (['order_pause', 'order_resume', 'order_cancel'].includes(data.type)) {
      if (data.type === 'order_pause') orderStore.pauseOrder()
      if (data.type === 'order_resume') orderStore.resumeOrder()
      if (data.type === 'order_cancel') orderStore.cancelOrder()
    }
    SocketClient.sendCmdAck({
      cmd_id: cmdId,
      stage: 'car_ack',
      ok: res.success === true,
      msg: res.error || '小车已确认命令',
    })
  })
}

function startBridgeStateReport() {
  bridgeStateTimer = setInterval(() => {
    if (SocketClient.connected) {
      SocketClient.sendBridgeState({
        ble_connected: connStore.bleConnected,
        control_owner: CommandArbiter.currentOwner,
        car_mode: carStore.mode,
        ble_device_name: connStore.bleDeviceName,
        app_version: '1.0.0',
        battery_level: carStore.batteryPct,
        signal_strength: connStore.bleRssi,
        worker_id: userStore.workerId,
        ts: Date.now(),
      })
    }
  }, 1000)
}

function cleanup() {
  if (bridgeStateTimer) {
    clearInterval(bridgeStateTimer)
    bridgeStateTimer = null
  }
  SocketClient.off('command')
  SocketClient.off('connectionChange')
  if (carTransport) {
    carTransport.disconnect()
    carTransport = null
  }
}

// ---- 用户操作 ----

function onJoystickMove(dx, dy) {
  const check = CommandArbiter.canExecute({ type: 'move' })
  if (!check.allowed) return

  if (carTransport) {
    if (dx === 0 && dy === 0) {
      carTransport.sendCommand({ type: 'stop' })
    } else {
      carTransport.sendCommand({ type: 'move', dx, dy })
    }
  }
}

function onLiftUp() {
  const check = CommandArbiter.canExecute({ type: 'lift_up' })
  if (!check.allowed) return
  carTransport?.sendCommand({ type: 'lift_up' })
}

function onLiftDown() {
  const check = CommandArbiter.canExecute({ type: 'lift_down' })
  if (!check.allowed) return
  carTransport?.sendCommand({ type: 'lift_down' })
}

function onLiftStop() {
  carTransport?.sendCommand({ type: 'lift_stop' })
}

function onSetGear(gear) {
  carStore.setSpeedGear(gear)
  carTransport?.sendCommand({ type: 'set_gear', gear })
}

function onEstop() {
  CommandArbiter.handleEstop()
  carTransport?.sendCommand({ type: 'estop' })
  if (SocketClient.connected) {
    SocketClient.sendAlarm({
      id: generateCmdId(),
      level: 'critical',
      code: 'ESTOP_LOCAL',
      source: 'app',
      msg: '手动急停触发',
      message: '手动急停触发',
      ts: Date.now(),
    })
  }
}

function onReset() {
  CommandArbiter.handleReset()
  carTransport?.sendCommand({ type: 'reset' })
}
</script>

<style scoped>
.main-page {
  min-height: 100vh;
  background-color: #111827;
}

.custom-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: #1F2937;
}

.nav-content {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 24rpx;
}

.nav-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #F9FAFB;
}

.nav-battery {
  display: flex;
  align-items: center;
}

.battery-text {
  font-size: 24rpx;
}

.battery-good {
  color: #10B981;
}

.battery-medium {
  color: #F59E0B;
}

.battery-low {
  color: #EF4444;
}

.main-content {
  display: flex;
  flex-direction: column;
}

.order-bar {
  padding: 12rpx 24rpx;
  background-color: rgba(59, 130, 246, 0.1);
  border-bottom: 1rpx solid #374151;
}

.order-text {
  font-size: 26rpx;
  color: #3B82F6;
}

.order-text-idle {
  color: #6B7280;
}

.arbiter-bar {
  padding: 8rpx 24rpx;
  border-bottom: 1rpx solid #374151;
}

.arbiter-text {
  font-size: 24rpx;
  color: #D1D5DB;
}

.control-area {
  display: flex;
  flex-direction: row;
  padding: 24rpx;
  gap: 24rpx;
}

.joystick-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lift-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gear-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
  padding: 12rpx 24rpx;
}

.gear-label {
  font-size: 26rpx;
  color: #D1D5DB;
  margin-right: 8rpx;
}

.gear-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  border-radius: 12rpx;
  background-color: #374151;
  border: 2rpx solid #4B5563;
}

.gear-active {
  background-color: rgba(59, 130, 246, 0.2);
  border-color: #3B82F6;
}

.gear-text {
  font-size: 26rpx;
  color: #F9FAFB;
}

.bottom-panel {
  padding: 16rpx 24rpx;
}

.status-bar {
  padding: 12rpx 24rpx;
  border-top: 1rpx solid #374151;
}

.status-text {
  font-size: 22rpx;
  color: #9CA3AF;
}
</style>
