/**
 * BLE 设备扫描封装
 */
class BleScanner {
  constructor() {
    this._initialized = false
    this._scanning = false
    this._devices = []
  }

  /**
   * 初始化蓝牙适配器
   */
  async init() {
    if (this._initialized) return

    return new Promise((resolve, reject) => {
      uni.openBluetoothAdapter({
        success: () => {
          this._initialized = true
          resolve()
        },
        fail: (err) => {
          reject(new Error(`蓝牙初始化失败: ${err.errMsg || err.errCode}`))
        },
      })
    })
  }

  /**
   * 扫描指定前缀的 BLE 设备
   * @param {string} namePrefix - 设备名前缀
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise<Array>} 发现的设备列表
   */
  async startScan(namePrefix = 'ESP32', timeout = 10000) {
    this._devices = []
    this._scanning = true

    return new Promise((resolve, reject) => {
      // 监听设备发现
      uni.onBluetoothDeviceFound((res) => {
        for (const device of res.devices) {
          if (device.name && device.name.startsWith(namePrefix)) {
            // 避免重复
            const exists = this._devices.find(d => d.deviceId === device.deviceId)
            if (!exists) {
              this._devices.push({
                deviceId: device.deviceId,
                name: device.name,
                RSSI: device.RSSI,
                advertisData: device.advertisData,
              })
            }
          }
        }
      })

      // 开始扫描
      uni.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: () => {
          console.log('[BleScanner] 开始扫描...')
        },
        fail: (err) => {
          this._scanning = false
          reject(new Error(`扫描启动失败: ${err.errMsg || err.errCode}`))
        },
      })

      // 超时后停止扫描并返回结果
      setTimeout(() => {
        this.stopScan()
        resolve([...this._devices])
      }, timeout)
    })
  }

  /**
   * 停止扫描
   */
  stopScan() {
    if (!this._scanning) return

    this._scanning = false
    uni.stopBluetoothDevicesDiscovery({
      success: () => {
        console.log('[BleScanner] 停止扫描')
      },
      fail: () => {},
    })
  }

  /**
   * 获取已发现的设备列表
   * @returns {Array}
   */
  getDevices() {
    return [...this._devices]
  }

  /**
   * 关闭蓝牙适配器
   */
  close() {
    this.stopScan()
    uni.closeBluetoothAdapter({
      success: () => {
        this._initialized = false
      },
      fail: () => {},
    })
  }
}

export default new BleScanner()
