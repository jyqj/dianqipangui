import { defineStore } from 'pinia'

export const useConnectionStore = defineStore('connection', {
  state: () => ({
    socketConnected: false,
    socketId: '',
    pcOnline: false,
    bleConnected: false,
    bleDeviceId: '',
    bleDeviceName: '',
    bleRssi: 0,
    lastError: '',

    serverIp: '192.168.1.100',
    serverPort: 3000,
    bleNamePrefix: 'ESP32',
    bleServiceUuid: '0000FFE0-0000-1000-8000-00805F9B34FB',
    bleCharWriteUuid: '0000FFE1-0000-1000-8000-00805F9B34FB',
    bleCharNotifyUuid: '0000FFE2-0000-1000-8000-00805F9B34FB',
    telemetryInterval: 500,
    joystickInterval: 100,
  }),

  getters: {
    serverUrl: (state) => `http://${state.serverIp}:${state.serverPort}`,
    isFullyConnected: (state) => state.socketConnected && state.bleConnected,
    connectionSummary: (state) => {
      const pc = state.socketConnected ? '在线' : '离线'
      const ble = state.bleConnected ? '已连接' : '未连接'
      return { pc, ble }
    },
  },

  actions: {
    setSocketConnected(connected, socketId) {
      this.socketConnected = connected
      this.socketId = socketId || ''
    },

    setPcOnline(online) {
      this.pcOnline = online
    },

    setBleConnected(connected, deviceInfo) {
      this.bleConnected = connected
      if (deviceInfo) {
        this.bleDeviceId = deviceInfo.deviceId || ''
        this.bleDeviceName = deviceInfo.deviceName || ''
        this.bleRssi = deviceInfo.rssi || 0
      }
      if (!connected) {
        this.bleDeviceId = ''
        this.bleDeviceName = ''
        this.bleRssi = 0
      }
    },

    setLastError(error) {
      this.lastError = error
    },

    updateSettings(settings) {
      if (settings.serverIp !== undefined) this.serverIp = settings.serverIp
      if (settings.serverPort !== undefined) this.serverPort = settings.serverPort
      if (settings.bleNamePrefix !== undefined) this.bleNamePrefix = settings.bleNamePrefix
      if (settings.bleServiceUuid !== undefined) this.bleServiceUuid = settings.bleServiceUuid
      if (settings.bleCharWriteUuid !== undefined) this.bleCharWriteUuid = settings.bleCharWriteUuid
      if (settings.bleCharNotifyUuid !== undefined) this.bleCharNotifyUuid = settings.bleCharNotifyUuid
      if (settings.telemetryInterval !== undefined) this.telemetryInterval = settings.telemetryInterval
      if (settings.joystickInterval !== undefined) this.joystickInterval = settings.joystickInterval
      this.saveSettings()
    },

    saveSettings() {
      uni.setStorageSync('app_settings', {
        serverIp: this.serverIp,
        serverPort: this.serverPort,
        bleNamePrefix: this.bleNamePrefix,
        bleServiceUuid: this.bleServiceUuid,
        bleCharWriteUuid: this.bleCharWriteUuid,
        bleCharNotifyUuid: this.bleCharNotifyUuid,
        telemetryInterval: this.telemetryInterval,
        joystickInterval: this.joystickInterval,
      })
    },

    loadSettings() {
      const settings = uni.getStorageSync('app_settings')
      if (settings) {
        this.updateSettings(settings)
      }
    },
  },
})
