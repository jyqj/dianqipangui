import CarTransport from './CarTransport'
import BleScanner from '../ble/BleScanner'
import BleWriteQueue from '../ble/BleWriteQueue'
import { BlePacketEncoder, BlePacketDecoder } from '../ble/BlePacketCodec'
import { BLE_UUID } from '../protocol/carProtocol'
import { log } from '../../utils/logger'

/**
 * 真实 BLE 小车通信实现
 * 待嵌入式完成后对接
 */
export default class BleCarTransport extends CarTransport {
  constructor() {
    super()
    this._connected = false
    this._deviceId = ''
    this._deviceName = ''
    this._serviceId = BLE_UUID.SERVICE
    this._charWriteId = BLE_UUID.CHAR_WRITE
    this._charNotifyId = BLE_UUID.CHAR_NOTIFY
    this._writeQueue = new BleWriteQueue()
    this._decoder = new BlePacketDecoder()
    this._mtu = 20
  }

  /**
   * 连接 BLE 小车
   * @param {string} namePrefix - 设备名前缀，如 "ESP32"
   * @returns {Promise<boolean>}
   */
  async connect(namePrefix = 'ESP32') {
    log('car', 'out', 'ble:connect', { namePrefix })

    try {
      // 1. 初始化蓝牙
      await BleScanner.init()

      // 2. 扫描设备
      const devices = await BleScanner.startScan(namePrefix, 10000)
      if (devices.length === 0) {
        throw new Error('未找到 BLE 设备')
      }

      // 选择信号最强的设备
      const target = devices.sort((a, b) => b.RSSI - a.RSSI)[0]
      this._deviceId = target.deviceId
      this._deviceName = target.name

      // 3. 连接设备
      // TODO: 待嵌入式完成后对接
      await this._createBLEConnection(this._deviceId)

      // 4. 获取服务和特征
      // TODO: 待嵌入式完成后对接
      await this._discoverServices()

      // 5. 启用通知
      // TODO: 待嵌入式完成后对接
      await this._enableNotify()

      this._connected = true
      log('car', 'in', 'ble:connected', { deviceId: this._deviceId, name: this._deviceName })
      return true
    } catch (err) {
      log('car', 'in', 'ble:connect_error', { error: err.message })
      this._connected = false
      throw err
    }
  }

  async disconnect() {
    log('car', 'out', 'ble:disconnect', { deviceId: this._deviceId })
    this._writeQueue.clear()

    if (this._deviceId) {
      try {
        // TODO: 待嵌入式完成后对接
        // uni.closeBLEConnection({ deviceId: this._deviceId })
      } catch (err) {
        console.error('[BleCarTransport] disconnect error:', err)
      }
    }

    this._connected = false
    this._deviceId = ''
    this._deviceName = ''
  }

  isConnected() {
    return this._connected
  }

  async sendCommand(cmd) {
    if (!this._connected) {
      return { success: false, error: '未连接' }
    }

    log('car', 'out', `ble:cmd:${cmd.type}`, cmd)

    try {
      const jsonStr = JSON.stringify(cmd)
      const packets = BlePacketEncoder.encode(jsonStr, this._mtu)

      for (const packet of packets) {
        this._writeQueue.enqueue(packet)
      }

      await this._writeQueue.flush(this._deviceId, this._serviceId, this._charWriteId)
      return { success: true }
    } catch (err) {
      log('car', 'in', 'ble:cmd_error', { error: err.message })
      return { success: false, error: err.message }
    }
  }

  // ---- 内部方法（待对接） ----

  async _createBLEConnection(deviceId) {
    // TODO: 待嵌入式完成后对接
    // return new Promise((resolve, reject) => {
    //   uni.createBLEConnection({
    //     deviceId,
    //     success: resolve,
    //     fail: reject,
    //   })
    // })
    throw new Error('BLE 连接尚未实现，请使用模拟模式')
  }

  async _discoverServices() {
    // TODO: 待嵌入式完成后对接
    // 获取服务列表 → 获取特征列表 → 确认写入和通知特征
  }

  async _enableNotify() {
    // TODO: 待嵌入式完成后对接
    // uni.notifyBLECharacteristicValueChange(...)
    // uni.onBLECharacteristicValueChange(res => { this._onBleData(res.value) })
  }

  /**
   * 处理 BLE 通知数据
   */
  _onBleData(arrayBuffer) {
    this._decoder.feed(arrayBuffer)
    if (this._decoder.isComplete()) {
      const jsonStr = this._decoder.getResult()
      try {
        const frame = JSON.parse(jsonStr)
        log('car', 'in', 'ble:data', frame)

        if (frame.type === 'status' && this._statusCallback) {
          this._statusCallback(frame)
        } else if (frame.type === 'alarm' && this._alarmCallback) {
          this._alarmCallback(frame)
        } else if (frame.type === 'order_done' && this._orderDoneCallback) {
          this._orderDoneCallback(frame)
        }
      } catch (err) {
        console.error('[BleCarTransport] parse error:', err)
      }
    }
  }

  /**
   * 获取设备信息
   */
  getDeviceInfo() {
    return {
      deviceId: this._deviceId,
      deviceName: this._deviceName,
      connected: this._connected,
    }
  }
}
