/**
 * BLE 分包/组包编解码
 *
 * 包格式:
 * | 0xAA (1B) | 序号 (1B) | 总包数 (1B) | 数据 (N B) |
 *
 * 序号从 0 开始
 */

const HEADER = 0xAA
const HEADER_SIZE = 3 // 1 header + 1 seq + 1 total

/**
 * 编码器：将 JSON 字符串分包为多个 ArrayBuffer
 */
export class BlePacketEncoder {
  /**
   * 将字符串编码为分包数组
   * @param {string} jsonString - JSON 字符串
   * @param {number} mtu - MTU 大小（默认 20）
   * @returns {ArrayBuffer[]} 分包数组
   */
  static encode(jsonString, mtu = 20) {
    const data = new TextEncoder().encode(jsonString)
    const payloadSize = mtu - HEADER_SIZE
    const totalPackets = Math.ceil(data.length / payloadSize)
    const packets = []

    for (let i = 0; i < totalPackets; i++) {
      const start = i * payloadSize
      const end = Math.min(start + payloadSize, data.length)
      const chunk = data.slice(start, end)

      const buffer = new ArrayBuffer(HEADER_SIZE + chunk.length)
      const view = new DataView(buffer)
      view.setUint8(0, HEADER)
      view.setUint8(1, i)           // 序号
      view.setUint8(2, totalPackets) // 总包数

      const uint8 = new Uint8Array(buffer)
      uint8.set(chunk, HEADER_SIZE)

      packets.push(buffer)
    }

    return packets
  }
}

/**
 * 解码器：组装分包为完整 JSON 字符串
 */
export class BlePacketDecoder {
  constructor() {
    this._packets = {}
    this._totalPackets = 0
    this._receivedCount = 0
  }

  /**
   * 输入一个数据包
   * @param {ArrayBuffer} packet
   */
  feed(packet) {
    const view = new DataView(packet)

    // 验证包头
    if (view.getUint8(0) !== HEADER) {
      console.warn('[BlePacketCodec] 无效包头')
      return
    }

    const seq = view.getUint8(1)
    const total = view.getUint8(2)

    // 新消息开始
    if (this._totalPackets !== total) {
      this._packets = {}
      this._totalPackets = total
      this._receivedCount = 0
    }

    // 存储数据部分
    const data = new Uint8Array(packet, HEADER_SIZE)
    this._packets[seq] = data
    this._receivedCount++
  }

  /**
   * 是否已收齐所有包
   * @returns {boolean}
   */
  isComplete() {
    return this._totalPackets > 0 && this._receivedCount >= this._totalPackets
  }

  /**
   * 组装完整结果
   * @returns {string} JSON 字符串
   */
  getResult() {
    if (!this.isComplete()) {
      throw new Error('数据包尚未收齐')
    }

    // 按序号拼接
    const chunks = []
    for (let i = 0; i < this._totalPackets; i++) {
      if (!this._packets[i]) {
        throw new Error(`缺失第 ${i} 包`)
      }
      chunks.push(this._packets[i])
    }

    // 合并并解码
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const merged = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    const result = new TextDecoder().decode(merged)

    // 重置状态
    this._packets = {}
    this._totalPackets = 0
    this._receivedCount = 0

    return result
  }

  /**
   * 重置解码器
   */
  reset() {
    this._packets = {}
    this._totalPackets = 0
    this._receivedCount = 0
  }
}
