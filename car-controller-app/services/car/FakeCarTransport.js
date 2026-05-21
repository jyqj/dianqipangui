import CarTransport from './CarTransport'
import { CAR_MODE, CAR_MOVE_STATE, CAR_LIFT_STATE, ALARM_LEVEL, ALARM_CODE, CAR_DEFAULTS } from '../protocol/carProtocol'
import { generateAlarmId } from '../../utils/id'
import { log } from '../../utils/logger'

/**
 * 预设循迹路径
 */
const FAKE_PATH = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 50, y: 80 },
  { x: 120, y: 80 },
  { x: 120, y: 150 },
  { x: 200, y: 150 },
]

/**
 * 计算路径总长度
 */
function calcPathLength(path) {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    total += Math.sqrt(dx * dx + dy * dy)
  }
  return total
}

/**
 * 在路径上按进度百分比插值位置
 */
function interpolatePath(path, pct) {
  if (pct <= 0) return { ...path[0] }
  if (pct >= 100) return { ...path[path.length - 1] }

  const totalLen = calcPathLength(path)
  const targetLen = (pct / 100) * totalLen

  let accumulated = 0
  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - path[i - 1].x
    const dy = path[i].y - path[i - 1].y
    const segLen = Math.sqrt(dx * dx + dy * dy)
    if (accumulated + segLen >= targetLen) {
      const ratio = (targetLen - accumulated) / segLen
      return {
        x: Math.round(path[i - 1].x + dx * ratio),
        y: Math.round(path[i - 1].y + dy * ratio),
      }
    }
    accumulated += segLen
  }
  return { ...path[path.length - 1] }
}

/**
 * 计算两点之间的朝向角度（度）
 */
function calcHeading(from, to) {
  return Math.round(Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI))
}

/**
 * 模拟小车实现
 * 无需 ESP32 硬件，在 App 内模拟小车全部行为
 */
export default class FakeCarTransport extends CarTransport {
  constructor() {
    super()
    this._connected = false
    this._statusTimer = null
    this._liftTimer = null
    this._traceTimer = null

    // 模拟状态
    this._state = {
      mode: CAR_MODE.IDLE,
      moveState: CAR_MOVE_STATE.IDLE,
      liftState: CAR_LIFT_STATE.IDLE,
      progressPct: 0,
      estimatedPos: { x: 0, y: 0 },
      estimatedHeading: 0,
      estimatedLiftHeightMm: 0,
      batteryV: 12.2,
      obstacleCm: 999,
      irSensors: [1, 1, 1, 1, 1], // 5 路红外，1=检测到线
    }

    // 当前移动速度系数
    this._speedGear = 2 // 1/2/3 档
    this._lastDx = 0
    this._lastDy = 0
    this._currentOrderId = null
  }

  async connect() {
    log('car', 'out', 'fake:connect', {})
    this._connected = true
    this._startStatusReport()
    return true
  }

  async disconnect() {
    log('car', 'out', 'fake:disconnect', {})
    this._connected = false
    this._stopAllTimers()
  }

  isConnected() {
    return this._connected
  }

  async sendCommand(cmd) {
    if (!this._connected) {
      return { success: false, error: '未连接' }
    }

    log('car', 'out', `fake:cmd:${cmd.type}`, cmd)

    switch (cmd.type) {
      case 'move':
        return this._handleMove(cmd)
      case 'stop':
        return this._handleStop()
      case 'lift_up':
        return this._handleLiftUp()
      case 'lift_down':
        return this._handleLiftDown()
      case 'lift_stop':
        return this._handleLiftStop()
      case 'trace':
      case 'trace_start':
        return this._handleTrace(cmd)
      case 'trace_pause':
        return this._handleTracePause()
      case 'trace_resume':
        return this._handleTraceResume()
      case 'trace_cancel':
        return this._handleTraceCancel()
      case 'estop':
        return this._handleEstop()
      case 'reset':
        return this._handleReset()
      case 'ping':
        return this._handlePing()
      case 'set_gear':
        return this._handleSetGear(cmd)
      default:
        return { success: false, error: `未知命令: ${cmd.type}` }
    }
  }

  // ---- 命令处理 ----

  _handleMove(cmd) {
    if (this._state.mode === CAR_MODE.ESTOP || this._state.mode === CAR_MODE.FAULT) {
      return { success: false, error: '急停/故障状态，无法移动' }
    }

    this._state.mode = CAR_MODE.MANUAL
    this._state.moveState = CAR_MOVE_STATE.MOVING
    this._lastDx = cmd.dx || 0
    this._lastDy = cmd.dy || 0

    // 按 dx/dy 改变位置
    const speed = this._speedGear * 2
    this._state.estimatedPos.x += Math.round(this._lastDx * speed)
    this._state.estimatedPos.y += Math.round(this._lastDy * speed)

    // 更新朝向
    if (Math.abs(this._lastDx) > 0.1 || Math.abs(this._lastDy) > 0.1) {
      this._state.estimatedHeading = Math.round(
        Math.atan2(this._lastDy, this._lastDx) * (180 / Math.PI)
      )
    }

    return { success: true }
  }

  _handleStop() {
    this._state.moveState = CAR_MOVE_STATE.IDLE
    this._lastDx = 0
    this._lastDy = 0
    if (this._state.mode === CAR_MODE.MANUAL) {
      this._state.mode = CAR_MODE.IDLE
    }
    return { success: true }
  }

  _handleLiftUp() {
    if (this._state.mode === CAR_MODE.ESTOP || this._state.mode === CAR_MODE.FAULT) {
      return { success: false, error: '急停/故障状态，无法操作推杆' }
    }

    this._state.liftState = CAR_LIFT_STATE.UP
    this._startLiftTimer()
    return { success: true }
  }

  _handleLiftDown() {
    if (this._state.mode === CAR_MODE.ESTOP || this._state.mode === CAR_MODE.FAULT) {
      return { success: false, error: '急停/故障状态，无法操作推杆' }
    }

    this._state.liftState = CAR_LIFT_STATE.DOWN
    this._startLiftTimer()
    return { success: true }
  }

  _handleLiftStop() {
    this._state.liftState = CAR_LIFT_STATE.IDLE
    this._stopLiftTimer()
    return { success: true }
  }

  _handleTrace(cmd = {}) {
    if (this._state.mode === CAR_MODE.ESTOP || this._state.mode === CAR_MODE.FAULT) {
      return { success: false, error: '急停/故障状态，无法启动循迹' }
    }

    this._state.mode = CAR_MODE.AUTO
    this._state.moveState = CAR_MOVE_STATE.TRACING
    this._state.progressPct = 0
    this._state.estimatedPos = { ...FAKE_PATH[0] }
    this._currentOrderId = cmd.order_id || cmd.orderId || null
    this._startTraceTimer()
    return { success: true }
  }

  _handleTracePause() {
    if (this._state.moveState === CAR_MOVE_STATE.TRACING) {
      this._state.moveState = CAR_MOVE_STATE.PAUSED
      this._stopTraceTimer()
      return { success: true }
    }
    return { success: false, error: '当前未在循迹' }
  }

  _handleTraceResume() {
    if (this._state.moveState === CAR_MOVE_STATE.PAUSED) {
      this._state.moveState = CAR_MOVE_STATE.TRACING
      this._startTraceTimer()
      return { success: true }
    }
    return { success: false, error: '当前未暂停' }
  }

  _handleTraceCancel() {
    this._stopTraceTimer()
    this._state.moveState = CAR_MOVE_STATE.IDLE
    this._state.mode = CAR_MODE.IDLE
    this._state.progressPct = 0
    this._currentOrderId = null
    return { success: true }
  }

  _handleEstop() {
    // 急停：立即停止所有动作
    this._stopLiftTimer()
    this._stopTraceTimer()

    this._state.mode = CAR_MODE.ESTOP
    this._state.moveState = CAR_MOVE_STATE.ESTOP
    this._state.liftState = CAR_LIFT_STATE.IDLE
    this._lastDx = 0
    this._lastDy = 0

    // 触发报警
    if (this._alarmCallback) {
      this._alarmCallback({
        id: generateAlarmId(),
        level: ALARM_LEVEL.CRITICAL,
        code: ALARM_CODE.ESTOP_LOCAL,
        message: '急停已触发',
        ts: Date.now(),
      })
    }

    return { success: true }
  }

  _handleReset() {
    this._state.mode = CAR_MODE.IDLE
    this._state.moveState = CAR_MOVE_STATE.IDLE
    this._state.liftState = CAR_LIFT_STATE.IDLE
    this._state.progressPct = 0
    this._lastDx = 0
    this._lastDy = 0
    this._currentOrderId = null
    return { success: true }
  }

  _handlePing() {
    return { success: true, state: { ...this._state } }
  }

  _handleSetGear(cmd) {
    const gear = cmd.gear
    if (gear >= 1 && gear <= 3) {
      this._speedGear = gear
      return { success: true, gear }
    }
    return { success: false, error: '无效档位' }
  }

  // ---- 定时器管理 ----

  _startStatusReport() {
    this._stopStatusReport()
    this._statusTimer = setInterval(() => {
      if (this._statusCallback) {
        // 模拟电池电压轻微波动
        this._state.batteryV = Math.round((12.0 + Math.random() * 0.6) * 10) / 10

        // 模拟障碍物距离
        this._state.obstacleCm = Math.round(50 + Math.random() * 200)

        this._statusCallback({
          ...this._state,
          estimatedPos: { ...this._state.estimatedPos },
          irSensors: [...this._state.irSensors],
          orderId: this._currentOrderId || undefined,
          order_id: this._currentOrderId || undefined,
          ts: Date.now(),
        })
      }
    }, CAR_DEFAULTS.TELEMETRY_INTERVAL_MS)
  }

  _stopStatusReport() {
    if (this._statusTimer) {
      clearInterval(this._statusTimer)
      this._statusTimer = null
    }
  }

  _startLiftTimer() {
    this._stopLiftTimer()
    this._liftTimer = setInterval(() => {
      if (this._state.liftState === CAR_LIFT_STATE.UP) {
        this._state.estimatedLiftHeightMm += CAR_DEFAULTS.LIFT_SPEED_MM_PER_100MS
        if (this._state.estimatedLiftHeightMm >= CAR_DEFAULTS.LIFT_MAX_HEIGHT_MM) {
          this._state.estimatedLiftHeightMm = CAR_DEFAULTS.LIFT_MAX_HEIGHT_MM
          this._state.liftState = CAR_LIFT_STATE.IDLE
          this._stopLiftTimer()
          // 到顶报警
          if (this._alarmCallback) {
            this._alarmCallback({
              id: generateAlarmId(),
              level: ALARM_LEVEL.WARNING,
              code: ALARM_CODE.LIMIT_HIT,
              message: '推杆已达最大高度',
              ts: Date.now(),
            })
          }
        }
      } else if (this._state.liftState === CAR_LIFT_STATE.DOWN) {
        this._state.estimatedLiftHeightMm -= CAR_DEFAULTS.LIFT_SPEED_MM_PER_100MS
        if (this._state.estimatedLiftHeightMm <= CAR_DEFAULTS.LIFT_MIN_HEIGHT_MM) {
          this._state.estimatedLiftHeightMm = CAR_DEFAULTS.LIFT_MIN_HEIGHT_MM
          this._state.liftState = CAR_LIFT_STATE.IDLE
          this._stopLiftTimer()
        }
      }
    }, 100)
  }

  _stopLiftTimer() {
    if (this._liftTimer) {
      clearInterval(this._liftTimer)
      this._liftTimer = null
    }
  }

  _startTraceTimer() {
    this._stopTraceTimer()
    this._traceTimer = setInterval(() => {
      if (this._state.moveState !== CAR_MOVE_STATE.TRACING) return

      const prevPos = { ...this._state.estimatedPos }
      this._state.progressPct += 3

      if (this._state.progressPct >= 100) {
        this._state.progressPct = 100
        this._state.estimatedPos = { ...FAKE_PATH[FAKE_PATH.length - 1] }
        this._state.moveState = CAR_MOVE_STATE.IDLE
        this._state.mode = CAR_MODE.IDLE
        this._stopTraceTimer()

        // 通知工单完成
        if (this._orderDoneCallback) {
          this._orderDoneCallback({
            success: true,
            orderId: this._currentOrderId || undefined,
            order_id: this._currentOrderId || undefined,
            finalPos: { ...this._state.estimatedPos },
            ts: Date.now(),
          })
        }
        return
      }

      // 沿路径插值
      const newPos = interpolatePath(FAKE_PATH, this._state.progressPct)
      this._state.estimatedHeading = calcHeading(prevPos, newPos)
      this._state.estimatedPos = newPos
    }, 500)
  }

  _stopTraceTimer() {
    if (this._traceTimer) {
      clearInterval(this._traceTimer)
      this._traceTimer = null
    }
  }

  _stopAllTimers() {
    this._stopStatusReport()
    this._stopLiftTimer()
    this._stopTraceTimer()
  }
}
