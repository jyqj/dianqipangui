import CarTransport from './CarTransport'
import BleScanner from '../ble/BleScanner'
import BleWriteQueue from '../ble/BleWriteQueue'
import { BlePacketEncoder, BlePacketDecoder } from '../ble/BlePacketCodec'
import { BLE_UUID } from '../protocol/carProtocol'
import { log } from '../../utils/logger'

function sameUuid(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase()
}

function firstWritable(chars) {
  return chars.find(c => c.properties?.write || c.properties?.writeNoResponse)
}

function firstNotifiable(chars) {
  return chars.find(c => c.properties?.notify || c.properties?.indicate)
}

/**
 * 真实 BLE 小车通信实现。
 * 不生成任何本地遥测；状态、报警和工单完成事件只来自 BLE notify。
 */
export default class BleCarTransport extends CarTransport {
  constructor(options = {}) {
    super()
    this._connected = false
    this._deviceId = ''
    this._deviceName = ''
    this._deviceRssi = 0
    this._serviceId = options.serviceId || BLE_UUID.SERVICE
    this._charWriteId = options.charWriteId || BLE_UUID.CHAR_WRITE
    this._charNotifyId = options.charNotifyId || BLE_UUID.CHAR_NOTIFY
    this._namePrefix = options.namePrefix || 'ESP32'
    this._writeQueue = new BleWriteQueue()
    this._decoder = new BlePacketDecoder()
    this._mtu = options.mtu || 20
    this._notifyHandler = null
  }

  async connect(namePrefix = this._namePrefix) {
    log('car', 'out', 'ble:connect', { namePrefix })

    try {
      await BleScanner.init()

      const devices = await BleScanner.startScan(namePrefix, 10000)
      if (devices.length === 0) {
        throw new Error(`未找到 BLE 设备：${namePrefix}`)
      }

      const target = devices.sort((a, b) => (b.RSSI || -999) - (a.RSSI || -999))[0]
      this._deviceId = target.deviceId
      this._deviceName = target.name
      this._deviceRssi = target.RSSI || 0

      await this._createBLEConnection(this._deviceId)
      await this._discoverServices()
      await this._enableNotify()

      this._connected = true
      log('car', 'in', 'ble:connected', this.getDeviceInfo())
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

    if (this._notifyHandler && typeof uni.offBLECharacteristicValueChange === 'function') {
      try { uni.offBLECharacteristicValueChange(this._notifyHandler) } catch (_) {}
    }
    this._notifyHandler = null

    if (this._deviceId) {
      try {
        await new Promise((resolve) => {
          uni.closeBLEConnection({
            deviceId: this._deviceId,
            success: resolve,
            fail: resolve,
          })
        })
      } catch (err) {
        console.error('[BleCarTransport] disconnect error:', err)
      }
    }

    this._connected = false
    this._deviceId = ''
    this._deviceName = ''
    this._deviceRssi = 0
  }

  isConnected() {
    return this._connected
  }

  async sendCommand(cmd) {
    if (!this._connected) {
      return { success: false, error: 'BLE 未连接' }
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

  _createBLEConnection(deviceId) {
    return new Promise((resolve, reject) => {
      uni.createBLEConnection({
        deviceId,
        timeout: 10000,
        success: resolve,
        fail: (err) => reject(new Error(`BLE 连接失败: ${err.errMsg || err.errCode}`)),
      })
    })
  }

  async _discoverServices() {
    const services = await new Promise((resolve, reject) => {
      uni.getBLEDeviceServices({
        deviceId: this._deviceId,
        success: (res) => resolve(res.services || []),
        fail: (err) => reject(new Error(`获取 BLE 服务失败: ${err.errMsg || err.errCode}`)),
      })
    })

    const service = services.find(s => sameUuid(s.uuid, this._serviceId))
    if (!service) {
      throw new Error(`未找到目标 BLE Service: ${this._serviceId}`)
    }
    this._serviceId = service.uuid

    const chars = await new Promise((resolve, reject) => {
      uni.getBLEDeviceCharacteristics({
        deviceId: this._deviceId,
        serviceId: this._serviceId,
        success: (res) => resolve(res.characteristics || []),
        fail: (err) => reject(new Error(`获取 BLE 特征失败: ${err.errMsg || err.errCode}`)),
      })
    })

    const writeChar = chars.find(c => sameUuid(c.uuid, this._charWriteId)) || firstWritable(chars)
    const notifyChar = chars.find(c => sameUuid(c.uuid, this._charNotifyId)) || firstNotifiable(chars)

    if (!writeChar) throw new Error(`未找到可写 BLE 特征: ${this._charWriteId}`)
    if (!notifyChar) throw new Error(`未找到可通知 BLE 特征: ${this._charNotifyId}`)

    this._charWriteId = writeChar.uuid
    this._charNotifyId = notifyChar.uuid
  }

  async _enableNotify() {
    this._notifyHandler = (res) => {
      if (res.deviceId !== this._deviceId) return
      if (!sameUuid(res.characteristicId, this._charNotifyId)) return
      this._onBleData(res.value)
    }
    uni.onBLECharacteristicValueChange(this._notifyHandler)

    await new Promise((resolve, reject) => {
      uni.notifyBLECharacteristicValueChange({
        deviceId: this._deviceId,
        serviceId: this._serviceId,
        characteristicId: this._charNotifyId,
        state: true,
        success: resolve,
        fail: (err) => reject(new Error(`启用 BLE notify 失败: ${err.errMsg || err.errCode}`)),
      })
    })
  }

  _onBleData(arrayBuffer) {
    this._decoder.feed(arrayBuffer)
    if (!this._decoder.isComplete()) return

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

  getDeviceInfo() {
    return {
      deviceId: this._deviceId,
      deviceName: this._deviceName,
      rssi: this._deviceRssi,
      connected: this._connected,
      serviceId: this._serviceId,
      charWriteId: this._charWriteId,
      charNotifyId: this._charNotifyId,
    }
  }
}
