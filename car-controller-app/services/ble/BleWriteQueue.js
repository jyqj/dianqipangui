/**
 * BLE 串行写入队列
 * 保证每次 writeBLECharacteristicValue 成功后才写下一个
 */
export default class BleWriteQueue {
  constructor() {
    this._queue = []
    this._flushing = false
  }

  /**
   * 加入队列
   * @param {ArrayBuffer} buffer
   */
  enqueue(buffer) {
    this._queue.push(buffer)
  }

  /**
   * 串行写入所有队列中的数据
   * @param {string} deviceId - BLE 设备 ID
   * @param {string} serviceId - 服务 UUID
   * @param {string} characteristicId - 特征 UUID
   * @returns {Promise<void>}
   */
  async flush(deviceId, serviceId, characteristicId) {
    if (this._flushing) {
      throw new Error('队列正在写入中')
    }

    this._flushing = true

    try {
      while (this._queue.length > 0) {
        const buffer = this._queue.shift()
        await this._write(deviceId, serviceId, characteristicId, buffer)
        // 每次写入后等待少许时间，避免写入过快
        await this._delay(20)
      }
    } finally {
      this._flushing = false
    }
  }

  /**
   * 清空队列
   */
  clear() {
    this._queue = []
    this._flushing = false
  }

  /**
   * 获取队列长度
   */
  get length() {
    return this._queue.length
  }

  /**
   * 写入单个数据包
   */
  _write(deviceId, serviceId, characteristicId, value) {
    return new Promise((resolve, reject) => {
      uni.writeBLECharacteristicValue({
        deviceId,
        serviceId,
        characteristicId,
        value,
        success: () => resolve(),
        fail: (err) => reject(new Error(`BLE写入失败: ${err.errMsg || err.errCode}`)),
      })
    })
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
