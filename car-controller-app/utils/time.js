/**
 * 格式化时间戳为 HH:mm:ss
 * @param {number} ts - 时间戳（毫秒）
 * @returns {string}
 */
export function formatTime(ts) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/**
 * 格式化时间戳为 YYYY-MM-DD HH:mm:ss
 * @param {number} ts - 时间戳（毫秒）
 * @returns {string}
 */
export function formatDate(ts) {
  const d = new Date(ts)
  const yyyy = d.getFullYear()
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`
}

/**
 * 格式化时间戳为 MM-DD HH:mm:ss
 * @param {number} ts - 时间戳（毫秒）
 * @returns {string}
 */
export function formatShortDate(ts) {
  const d = new Date(ts)
  const MM = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${MM}-${dd} ${hh}:${mm}:${ss}`
}
