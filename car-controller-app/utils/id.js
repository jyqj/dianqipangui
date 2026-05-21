/**
 * 生成命令 ID
 * @returns {string} 格式: cmd_{timestamp}_{random4}
 */
export function generateCmdId() {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
}

/**
 * 生成工单 ID
 * @returns {string} 格式: wo_{timestamp}_{random4}
 */
export function generateOrderId() {
  return `wo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
}

/**
 * 生成报警 ID
 * @returns {string} 格式: alm_{timestamp}_{random4}
 */
export function generateAlarmId() {
  return `alm_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`
}
