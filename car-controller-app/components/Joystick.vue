<template>
  <view class="joystick-wrapper">
    <canvas
      canvas-id="joystickCanvas"
      id="joystickCanvas"
      class="joystick-canvas"
      :style="{ width: canvasSize + 'px', height: canvasSize + 'px' }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    ></canvas>
    <view v-if="disabled" class="joystick-overlay">
      <text class="overlay-text">已锁定</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  size: {
    type: Number,
    default: 200,
  },
})

const emit = defineEmits(['move'])

const canvasSize = ref(props.size)
const centerX = ref(canvasSize.value / 2)
const centerY = ref(canvasSize.value / 2)
const outerRadius = ref(canvasSize.value / 2 - 10)
const innerRadius = ref(30)
const knobX = ref(centerX.value)
const knobY = ref(centerY.value)
const isDragging = ref(false)

let ctx = null
let sendTimer = null

onMounted(() => {
  ctx = uni.createCanvasContext('joystickCanvas')
  drawJoystick()
})

onUnmounted(() => {
  if (sendTimer) {
    clearInterval(sendTimer)
    sendTimer = null
  }
})

watch(() => props.disabled, (val) => {
  if (val) {
    resetKnob()
  }
})

function drawJoystick() {
  if (!ctx) return

  const cx = centerX.value
  const cy = centerY.value
  const or = outerRadius.value
  const ir = innerRadius.value

  ctx.clearRect(0, 0, canvasSize.value, canvasSize.value)

  // 外圈底盘
  ctx.beginPath()
  ctx.arc(cx, cy, or, 0, Math.PI * 2)
  ctx.setFillStyle('rgba(75, 85, 99, 0.6)')
  ctx.fill()
  ctx.setStrokeStyle('rgba(107, 114, 128, 0.8)')
  ctx.setLineWidth(2)
  ctx.stroke()

  // 十字准线
  ctx.beginPath()
  ctx.moveTo(cx - or * 0.6, cy)
  ctx.lineTo(cx + or * 0.6, cy)
  ctx.moveTo(cx, cy - or * 0.6)
  ctx.lineTo(cx, cy + or * 0.6)
  ctx.setStrokeStyle('rgba(107, 114, 128, 0.3)')
  ctx.setLineWidth(1)
  ctx.stroke()

  // 内球（摇杆）
  ctx.beginPath()
  ctx.arc(knobX.value, knobY.value, ir, 0, Math.PI * 2)
  const knobColor = props.disabled ? 'rgba(107, 114, 128, 0.8)' : 'rgba(59, 130, 246, 0.9)'
  ctx.setFillStyle(knobColor)
  ctx.fill()
  ctx.setStrokeStyle(props.disabled ? '#6B7280' : '#2563EB')
  ctx.setLineWidth(2)
  ctx.stroke()

  // 内球高光
  ctx.beginPath()
  ctx.arc(knobX.value - ir * 0.2, knobY.value - ir * 0.2, ir * 0.3, 0, Math.PI * 2)
  ctx.setFillStyle('rgba(255, 255, 255, 0.2)')
  ctx.fill()

  ctx.draw()
}

function getCanvasPosition(touch) {
  // 直接使用 touch 的坐标减去 canvas 偏移
  // 在 uni-app 中需要考虑组件偏移
  return {
    x: touch.x,
    y: touch.y,
  }
}

function onTouchStart(e) {
  if (props.disabled) return
  isDragging.value = true
  const touch = e.touches[0]
  updateKnobPosition(touch.x, touch.y)

  // 启动发送定时器
  if (!sendTimer) {
    sendTimer = setInterval(() => {
      if (isDragging.value) {
        emitMove()
      }
    }, 100)
  }
}

function onTouchMove(e) {
  if (props.disabled || !isDragging.value) return
  const touch = e.touches[0]
  updateKnobPosition(touch.x, touch.y)
}

function onTouchEnd() {
  isDragging.value = false
  resetKnob()

  if (sendTimer) {
    clearInterval(sendTimer)
    sendTimer = null
  }

  // 发送停止信号
  emit('move', 0, 0)
}

function updateKnobPosition(touchX, touchY) {
  const cx = centerX.value
  const cy = centerY.value
  const maxDist = outerRadius.value - innerRadius.value

  let dx = touchX - cx
  let dy = touchY - cy
  const dist = Math.sqrt(dx * dx + dy * dy)

  // 限制在外圈范围内
  if (dist > maxDist) {
    dx = (dx / dist) * maxDist
    dy = (dy / dist) * maxDist
  }

  knobX.value = cx + dx
  knobY.value = cy + dy
  drawJoystick()
}

function resetKnob() {
  knobX.value = centerX.value
  knobY.value = centerY.value
  drawJoystick()
}

function emitMove() {
  const cx = centerX.value
  const cy = centerY.value
  const maxDist = outerRadius.value - innerRadius.value

  const dx = (knobX.value - cx) / maxDist
  const dy = (knobY.value - cy) / maxDist

  // 归一化到 -1 ~ 1，添加死区
  const normalizedDx = Math.abs(dx) < 0.1 ? 0 : Math.round(dx * 100) / 100
  const normalizedDy = Math.abs(dy) < 0.1 ? 0 : Math.round(dy * 100) / 100

  if (normalizedDx !== 0 || normalizedDy !== 0) {
    emit('move', normalizedDx, normalizedDy)
  }
}
</script>

<style scoped>
.joystick-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.joystick-canvas {
  /* 尺寸通过 style 绑定 */
}

.joystick-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
}

.overlay-text {
  color: #9CA3AF;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
