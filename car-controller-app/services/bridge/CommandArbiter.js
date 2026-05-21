import { CONTROL_OWNER } from '../protocol/pcProtocol'
import { log } from '../../utils/logger'

/**
 * 控制权仲裁器
 * 管理 App 手动 / PC 自动 / PC 接管 / 急停 / 故障 之间的控制权切换
 */
class CommandArbiter {
  constructor() {
    this.currentOwner = CONTROL_OWNER.APP_MANUAL
    this._listeners = []
  }

  /**
   * 判断当前状态是否允许执行命令
   * @param {object} cmd - 命令对象
   * @returns {{ allowed: boolean, reason?: string }}
   */
  canExecute(cmd) {
    // 急停始终允许
    if (cmd.type === 'estop') {
      return { allowed: true }
    }

    // 复位仅在急停/故障时允许
    if (cmd.type === 'reset') {
      if (this.currentOwner === CONTROL_OWNER.ESTOP || this.currentOwner === CONTROL_OWNER.FAULT) {
        return { allowed: true }
      }
      return { allowed: false, reason: '当前状态无需复位' }
    }

    // 被锁定时不允许手动操作
    if (this.isLocked()) {
      return { allowed: false, reason: `控制权已被锁定: ${this.currentOwner}` }
    }

    return { allowed: true }
  }

  /**
   * 处理上位机命令，可能切换控制权
   * @param {object} cmd - PC 下发的命令
   * @returns {{ accepted: boolean, reason?: string }}
   */
  handlePcCommand(cmd) {
    log('car', 'in', 'arbiter:pc_cmd', { type: cmd.type, currentOwner: this.currentOwner })

    // PC 急停
    if (cmd.type === 'estop') {
      this._setOwner(CONTROL_OWNER.ESTOP)
      return { accepted: true }
    }

    // PC 接管
    if (cmd.type === 'takeover') {
      this._setOwner(CONTROL_OWNER.PC_TAKEOVER)
      return { accepted: true }
    }

    // PC 释放控制权
    if (cmd.type === 'release') {
      this._setOwner(CONTROL_OWNER.APP_MANUAL)
      return { accepted: true }
    }

    // PC 自动模式命令（工单/循迹等）
    if (['order_start', 'order_pause', 'order_resume', 'trace', 'trace_start', 'trace_pause', 'trace_resume'].includes(cmd.type)) {
      this._setOwner(CONTROL_OWNER.PC_AUTO)
      return { accepted: true }
    }

    // 急停状态下不接受 PC 非急停命令
    if (this.currentOwner === CONTROL_OWNER.ESTOP) {
      return { accepted: false, reason: '急停状态，请先复位' }
    }

    // 故障状态下不接受命令
    if (this.currentOwner === CONTROL_OWNER.FAULT) {
      return { accepted: false, reason: '故障状态' }
    }

    return { accepted: true }
  }

  /**
   * 处理急停
   */
  handleEstop() {
    log('car', 'in', 'arbiter:estop', {})
    this._setOwner(CONTROL_OWNER.ESTOP)
  }

  /**
   * 处理复位
   */
  handleReset() {
    log('car', 'in', 'arbiter:reset', {})
    this._setOwner(CONTROL_OWNER.APP_MANUAL)
  }

  /**
   * 处理故障
   */
  handleFault() {
    log('car', 'in', 'arbiter:fault', {})
    this._setOwner(CONTROL_OWNER.FAULT)
  }

  /**
   * 当前是否被锁定（接管/急停/故障时手动操作被禁）
   * @returns {boolean}
   */
  isLocked() {
    return [
      CONTROL_OWNER.PC_TAKEOVER,
      CONTROL_OWNER.PC_AUTO,
      CONTROL_OWNER.ESTOP,
      CONTROL_OWNER.FAULT,
    ].includes(this.currentOwner)
  }

  /**
   * 获取当前控制权所有者的中文描述
   */
  getOwnerLabel() {
    const labels = {
      [CONTROL_OWNER.APP_MANUAL]: 'App本地',
      [CONTROL_OWNER.PC_AUTO]: 'PC自动',
      [CONTROL_OWNER.PC_TAKEOVER]: 'PC接管',
      [CONTROL_OWNER.ESTOP]: '急停',
      [CONTROL_OWNER.FAULT]: '故障',
    }
    return labels[this.currentOwner] || this.currentOwner
  }

  /**
   * 注册控制权变化监听
   */
  onChange(callback) {
    this._listeners.push(callback)
  }

  /**
   * 移除监听
   */
  offChange(callback) {
    this._listeners = this._listeners.filter(cb => cb !== callback)
  }

  _setOwner(owner) {
    const prev = this.currentOwner
    this.currentOwner = owner
    if (prev !== owner) {
      log('car', 'in', 'arbiter:owner_change', { from: prev, to: owner })
      this._listeners.forEach(cb => {
        try { cb(owner, prev) } catch (err) { console.error(err) }
      })
    }
  }
}

export default new CommandArbiter()
