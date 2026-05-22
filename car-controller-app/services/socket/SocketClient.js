import io from 'socket.io-client'
import { log } from '../../utils/logger'

function normalizeTelemetry(frame) {
  const pos = frame.estimatedPos || frame.estimated_pos || {}
  return {
    mode: frame.mode || 'idle',
    move_state: frame.move_state || frame.moveState || 'idle',
    lift_state: frame.lift_state || frame.liftState || 'idle',
    estimated_x: frame.estimated_x ?? pos.x ?? 0,
    estimated_y: frame.estimated_y ?? pos.y ?? 0,
    progress_pct: frame.progress_pct ?? frame.progressPct ?? 0,
    battery_v: frame.battery_v ?? frame.batteryV ?? 0,
    obstacle_cm: frame.obstacle_cm ?? frame.obstacleCm ?? 999,
    rssi: frame.rssi ?? frame.bleRssi ?? 0,
    order_id: frame.order_id ?? frame.orderId,
    ts: frame.ts || Date.now(),
  }
}

function normalizeAlarm(alarm) {
  return {
    code: alarm.code || 'UNKNOWN',
    level: alarm.level || 'info',
    msg: alarm.msg || alarm.message || '',
    message: alarm.message || alarm.msg || '',
    source: alarm.source || 'app',
    order_id: alarm.order_id ?? alarm.orderId,
    ts: alarm.ts || Date.now(),
  }
}

class SocketClient {
  constructor() {
    this.socket = null
    this.serverUrl = ''
    this.connected = false
    this.listeners = {}
  }

  connect(url) {
    if (this.socket) {
      this.disconnect()
    }

    this.serverUrl = url
    log('socket', 'out', 'connect', { url })

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 5000,
    })

    this.socket.on('connect', () => {
      this.connected = true
      log('socket', 'in', 'connect', { id: this.socket.id })
      this._emit('connectionChange', true)
    })

    this.socket.on('disconnect', (reason) => {
      this.connected = false
      log('socket', 'in', 'disconnect', { reason })
      this._emit('connectionChange', false)
    })

    this.socket.on('connect_error', (err) => {
      log('socket', 'in', 'connect_error', { message: err.message })
      this._emit('connectError', err.message)
    })

    this.socket.on('pc:auth_result', (data) => {
      log('socket', 'in', 'pc:auth_result', data)
      this._emit('authResult', data)
    })

    this.socket.on('pc:command', (data) => {
      log('socket', 'in', 'pc:command', data)
      this._emit('command', data)
    })
  }

  login(workerNo, password) {
    log('socket', 'out', 'app:auth', { worker_no: workerNo })
    this.socket?.emit('app:auth', { worker_no: workerNo, password })
  }

  sendHello(appVersion, workerId) {
    const data = { app_version: appVersion, worker_id: workerId }
    log('socket', 'out', 'app:hello', data)
    this.socket?.emit('app:hello', data)
  }

  sendBridgeState(state) {
    log('socket', 'out', 'app:bridge_state', state)
    this.socket?.emit('app:bridge_state', state)
  }

  sendTelemetry(frame) {
    this.socket?.emit('app:telemetry', normalizeTelemetry(frame))
  }

  sendAlarm(alarm) {
    const normalized = normalizeAlarm(alarm)
    log('socket', 'out', 'app:alarm', normalized)
    this.socket?.emit('app:alarm', normalized)
  }

  sendCmdAck(ack) {
    const normalized = {
      cmd_id: ack.cmd_id,
      stage: ack.stage || ack.status,
      ok: typeof ack.ok === 'boolean' ? ack.ok : ack.status === 'ok',
      msg: ack.msg || ack.message || '',
    }
    log('socket', 'out', 'app:cmd_ack', normalized)
    this.socket?.emit('app:cmd_ack', normalized)
  }

  sendOrderEvent(event) {
    const normalized = {
      order_id: event.order_id ?? event.orderId,
      event_type: event.event_type || event.type || 'event',
      status: event.status,
      message: event.message,
      result: event.result,
      ts: event.ts || Date.now(),
    }
    log('socket', 'out', 'app:order_event', normalized)
    this.socket?.emit('app:order_event', normalized)
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(callback)
  }

  off(event, callback) {
    if (!this.listeners[event]) return
    if (!callback) {
      delete this.listeners[event]
      return
    }
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback)
  }

  _emit(event, data) {
    this.listeners[event]?.forEach(cb => {
      try {
        cb(data)
      } catch (err) {
        console.error(`[SocketClient] listener error for ${event}:`, err)
      }
    })
  }

  disconnect() {
    log('socket', 'out', 'disconnect', {})
    this.socket?.disconnect()
    this.socket = null
    this.connected = false
  }

  getSocketId() {
    return this.socket?.id ?? ''
  }
}

export default new SocketClient()
