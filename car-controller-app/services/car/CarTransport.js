/**
 * 小车通信抽象基类
 * 所有小车通信实现（Fake/BLE）都必须继承此类
 */
export default class CarTransport {
  constructor() {
    this._statusCallback = null
    this._alarmCallback = null
    this._orderDoneCallback = null
  }

  /**
   * 连接小车
   * @returns {Promise<boolean>}
   */
  async connect() {
    throw new Error('子类必须实现 connect()')
  }

  /**
   * 断开连接
   */
  async disconnect() {
    throw new Error('子类必须实现 disconnect()')
  }

  /**
   * 发送命令
   * @param {object} cmd - 命令对象 { type, ...params }
   * @returns {Promise<object>} 命令结果
   */
  async sendCommand(cmd) {
    throw new Error('子类必须实现 sendCommand()')
  }

  /**
   * 注册状态回调（每帧调用）
   * @param {function} callback - (statusFrame) => void
   */
  onStatus(callback) {
    this._statusCallback = callback
  }

  /**
   * 注册报警回调
   * @param {function} callback - (alarm) => void
   */
  onAlarm(callback) {
    this._alarmCallback = callback
  }

  /**
   * 注册工单完成回调
   * @param {function} callback - (result) => void
   */
  onOrderDone(callback) {
    this._orderDoneCallback = callback
  }

  /**
   * 是否已连接
   * @returns {boolean}
   */
  isConnected() {
    return false
  }
}
