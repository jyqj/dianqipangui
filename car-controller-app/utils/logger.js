/**
 * 环形缓冲区日志工具
 * 分别记录 Socket.IO 日志和 Car 指令日志
 */

const MAX_SOCKET_LOGS = 50
const MAX_CAR_LOGS = 50

const socketLogs = []
const carLogs = []

/**
 * 记录日志
 * @param {'socket'|'car'} type - 日志类型
 * @param {'in'|'out'} direction - 方向
 * @param {string} event - 事件名
 * @param {*} data - 数据
 */
export function log(type, direction, event, data) {
  const entry = {
    ts: Date.now(),
    direction,
    event,
    data: typeof data === 'object' ? JSON.stringify(data) : String(data ?? ''),
  }

  if (type === 'socket') {
    socketLogs.push(entry)
    if (socketLogs.length > MAX_SOCKET_LOGS) {
      socketLogs.shift()
    }
  } else if (type === 'car') {
    carLogs.push(entry)
    if (carLogs.length > MAX_CAR_LOGS) {
      carLogs.shift()
    }
  }

  // 同步输出到控制台
  const arrow = direction === 'in' ? '<-' : '->'
  console.log(`[${type}] ${arrow} ${event}`, data ?? '')
}

/**
 * 获取最近的 Socket.IO 日志
 * @returns {Array}
 */
export function getSocketLogs() {
  return [...socketLogs]
}

/**
 * 获取最近的 Car 指令日志
 * @returns {Array}
 */
export function getCarLogs() {
  return [...carLogs]
}

/**
 * 清空所有日志
 */
export function clearLogs() {
  socketLogs.length = 0
  carLogs.length = 0
}
