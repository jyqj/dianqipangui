/**
 * 小车通信协议常量
 */

export const CAR_CMD = {
  MOVE: 'move',
  STOP: 'stop',
  LIFT_UP: 'lift_up',
  LIFT_DOWN: 'lift_down',
  LIFT_STOP: 'lift_stop',
  TRACE_START: 'trace_start',
  TRACE_PAUSE: 'trace_pause',
  TRACE_RESUME: 'trace_resume',
  TRACE_CANCEL: 'trace_cancel',
  ESTOP: 'estop',
  RESET: 'reset',
  PING: 'ping',
}

export const CAR_MOVE_STATE = {
  IDLE: 'idle',
  MOVING: 'moving',
  TRACING: 'tracing',
  PAUSED: 'paused',
  ESTOP: 'estop',
  FAULT: 'fault',
}

export const CAR_LIFT_STATE = {
  IDLE: 'idle',
  UP: 'up',
  DOWN: 'down',
}

export const CAR_MODE = {
  IDLE: 'idle',
  MANUAL: 'manual',
  AUTO: 'auto',
  ESTOP: 'estop',
  FAULT: 'fault',
}

export const ALARM_LEVEL = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'critical',
}

export const ALARM_CODE = {
  ESTOP_LOCAL: 'ESTOP_LOCAL',
  ESTOP_REMOTE: 'ESTOP_REMOTE',
  BLE_LOST: 'BLE_LOST',
  PC_LOST: 'PC_LOST',
  OBSTACLE: 'OBSTACLE',
  LOW_BATTERY: 'LOW_BATTERY',
  LIMIT_HIT: 'LIMIT_HIT',
  COMMAND_TIMEOUT: 'COMMAND_TIMEOUT',
  APP_OFFLINE: 'APP_OFFLINE',
}

export const BLE_UUID = {
  SERVICE: '0000FFE0-0000-1000-8000-00805F9B34FB',
  CHAR_WRITE: '0000FFE1-0000-1000-8000-00805F9B34FB',
  CHAR_NOTIFY: '0000FFE2-0000-1000-8000-00805F9B34FB',
}

export const CAR_DEFAULTS = {
  LIFT_MAX_HEIGHT_MM: 200,
  LIFT_MIN_HEIGHT_MM: 0,
  LIFT_SPEED_MM_PER_100MS: 5,
  TELEMETRY_INTERVAL_MS: 500,
  JOYSTICK_SEND_INTERVAL_MS: 100,
  BATTERY_FULL_V: 12.6,
  BATTERY_EMPTY_V: 10.5,
  OBSTACLE_WARN_CM: 30,
}
