/**
 * 上位机通信协议常量
 * 与 upper-computer/src/shared/protocol.ts 保持一致。
 */

export const PC_EVENTS = {
  APP_HELLO: 'app:hello',
  APP_AUTH: 'app:auth',
  APP_BRIDGE_STATE: 'app:bridge_state',
  APP_TELEMETRY: 'app:telemetry',
  APP_ALARM: 'app:alarm',
  APP_CMD_ACK: 'app:cmd_ack',
  APP_ORDER_EVENT: 'app:order_event',

  PC_AUTH_RESULT: 'pc:auth_result',
  PC_COMMAND: 'pc:command',
}

export const PC_CMD_TYPES = {
  ORDER_START: 'order_start',
  ORDER_PAUSE: 'order_pause',
  ORDER_RESUME: 'order_resume',
  ORDER_CANCEL: 'order_cancel',
  ESTOP: 'estop',
  TAKEOVER: 'takeover',
  RELEASE: 'release',
  SYNC: 'sync',

  // 兼容旧版/本地手动命令
  MOVE: 'move',
  STOP: 'stop',
  LIFT_UP: 'lift_up',
  LIFT_DOWN: 'lift_down',
  LIFT_STOP: 'lift_stop',
  TRACE_START: 'trace_start',
  TRACE_PAUSE: 'trace_pause',
  TRACE_RESUME: 'trace_resume',
  TRACE_CANCEL: 'trace_cancel',
  RESET: 'reset',
  PING: 'ping',
}

export const CONTROL_OWNER = {
  APP_MANUAL: 'app_manual',
  PC_AUTO: 'pc_auto',
  PC_TAKEOVER: 'pc_takeover',
  ESTOP: 'estop',
  FAULT: 'fault',
}

export const BRIDGE_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  SIMULATING: 'simulating',
}

export const AUTH_RESULT = {
  OK: 'ok',
  FAIL: 'fail',
  EXPIRED: 'expired',
}
