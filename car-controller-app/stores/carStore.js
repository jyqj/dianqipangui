import { defineStore } from 'pinia'
import { CAR_MODE, CAR_MOVE_STATE, CAR_LIFT_STATE, CAR_DEFAULTS } from '../services/protocol/carProtocol'

export const useCarStore = defineStore('car', {
  state: () => ({
    mode: CAR_MODE.IDLE,
    moveState: CAR_MOVE_STATE.IDLE,
    liftState: CAR_LIFT_STATE.IDLE,
    progressPct: 0,
    estimatedPos: { x: 0, y: 0 },
    estimatedHeading: 0,
    estimatedLiftHeightMm: 0,
    batteryV: 0,
    obstacleCm: 999,
    irSensors: [0, 0, 0, 0, 0],
    lastUpdateTs: 0,
    speedGear: 2, // 1/2/3 档
  }),

  getters: {
    isEstop: (state) => state.mode === CAR_MODE.ESTOP,
    isFault: (state) => state.mode === CAR_MODE.FAULT,
    isAuto: (state) => state.mode === CAR_MODE.AUTO,
    isIdle: (state) => state.mode === CAR_MODE.IDLE,
    isMoving: (state) => state.moveState === CAR_MOVE_STATE.MOVING,
    isTracing: (state) => state.moveState === CAR_MOVE_STATE.TRACING,

    batteryPct: (state) => {
      const range = CAR_DEFAULTS.BATTERY_FULL_V - CAR_DEFAULTS.BATTERY_EMPTY_V
      const pct = ((state.batteryV - CAR_DEFAULTS.BATTERY_EMPTY_V) / range) * 100
      return Math.max(0, Math.min(100, Math.round(pct)))
    },

    batteryLevel: (state) => {
      const range = CAR_DEFAULTS.BATTERY_FULL_V - CAR_DEFAULTS.BATTERY_EMPTY_V
      const pct = ((state.batteryV - CAR_DEFAULTS.BATTERY_EMPTY_V) / range) * 100
      if (pct > 60) return 'good'
      if (pct > 20) return 'medium'
      return 'low'
    },

    liftHeightPct: (state) => {
      return Math.round((state.estimatedLiftHeightMm / CAR_DEFAULTS.LIFT_MAX_HEIGHT_MM) * 100)
    },

    modeLabel: (state) => {
      const labels = {
        [CAR_MODE.IDLE]: '待机',
        [CAR_MODE.MANUAL]: '手动',
        [CAR_MODE.AUTO]: '自动',
        [CAR_MODE.ESTOP]: '急停',
        [CAR_MODE.FAULT]: '故障',
      }
      return labels[state.mode] || state.mode
    },

    moveStateLabel: (state) => {
      const labels = {
        [CAR_MOVE_STATE.IDLE]: '停止',
        [CAR_MOVE_STATE.MOVING]: '移动中',
        [CAR_MOVE_STATE.TRACING]: '循迹中',
        [CAR_MOVE_STATE.PAUSED]: '已暂停',
        [CAR_MOVE_STATE.ESTOP]: '急停',
        [CAR_MOVE_STATE.FAULT]: '故障',
      }
      return labels[state.moveState] || state.moveState
    },
  },

  actions: {
    updateFromTelemetry(frame) {
      const pos = frame.estimatedPos || frame.estimated_pos
      this.mode = frame.mode || this.mode
      this.moveState = frame.moveState || frame.move_state || this.moveState
      this.liftState = frame.liftState || frame.lift_state || this.liftState
      this.progressPct = frame.progressPct ?? frame.progress_pct ?? this.progressPct
      if (pos) {
        this.estimatedPos = { x: pos.x ?? this.estimatedPos.x, y: pos.y ?? this.estimatedPos.y }
      } else if (frame.estimated_x !== undefined || frame.estimated_y !== undefined) {
        this.estimatedPos = {
          x: frame.estimated_x ?? this.estimatedPos.x,
          y: frame.estimated_y ?? this.estimatedPos.y,
        }
      }
      this.estimatedHeading = frame.estimatedHeading ?? frame.estimated_heading ?? this.estimatedHeading
      this.estimatedLiftHeightMm = frame.estimatedLiftHeightMm ?? frame.estimated_lift_height_mm ?? this.estimatedLiftHeightMm
      this.batteryV = frame.batteryV ?? frame.battery_v ?? this.batteryV
      this.obstacleCm = frame.obstacleCm ?? frame.obstacle_cm ?? this.obstacleCm
      if (frame.irSensors || frame.ir_sensors) {
        this.irSensors = [...(frame.irSensors || frame.ir_sensors)]
      }
      this.lastUpdateTs = frame.ts || Date.now()
    },

    setSpeedGear(gear) {
      if (gear >= 1 && gear <= 3) {
        this.speedGear = gear
      }
    },

    reset() {
      this.mode = CAR_MODE.IDLE
      this.moveState = CAR_MOVE_STATE.IDLE
      this.liftState = CAR_LIFT_STATE.IDLE
      this.progressPct = 0
      this.estimatedPos = { x: 0, y: 0 }
      this.estimatedHeading = 0
      this.estimatedLiftHeightMm = 0
      this.batteryV = 0
      this.obstacleCm = 999
      this.irSensors = [0, 0, 0, 0, 0]
      this.lastUpdateTs = 0
    },
  },
})
