import { PC_CMD_TYPES } from '../protocol/pcProtocol'
import { CAR_CMD } from '../protocol/carProtocol'

/**
 * 上位机命令到小车指令的映射。
 * 兼容 payload 包裹格式：{ cmd_id, type, payload }。
 */
export default class CommandMapper {
  static mapCommand(pcCommand) {
    const type = pcCommand.type
    const payload = pcCommand.payload || {}
    const cmdId = pcCommand.cmd_id || pcCommand.id

    switch (type) {
      case PC_CMD_TYPES.ORDER_START:
      case PC_CMD_TYPES.TRACE_START:
        return {
          id: cmdId,
          type: CAR_CMD.TRACE_START,
          order_id: payload.order_id || pcCommand.order_id,
          order_no: payload.order_no,
          target_x: payload.target_x,
          target_y: payload.target_y,
          target_node: payload.target_node,
          path: payload.path || null,
        }

      case PC_CMD_TYPES.ORDER_PAUSE:
      case PC_CMD_TYPES.TRACE_PAUSE:
        return { id: cmdId, type: CAR_CMD.TRACE_PAUSE }

      case PC_CMD_TYPES.ORDER_RESUME:
      case PC_CMD_TYPES.TRACE_RESUME:
        return { id: cmdId, type: CAR_CMD.TRACE_RESUME }

      case PC_CMD_TYPES.ORDER_CANCEL:
      case PC_CMD_TYPES.TRACE_CANCEL:
        return { id: cmdId, type: CAR_CMD.TRACE_CANCEL }

      case PC_CMD_TYPES.MOVE:
        return {
          id: cmdId,
          type: CAR_CMD.MOVE,
          dx: payload.dx ?? pcCommand.dx ?? 0,
          dy: payload.dy ?? pcCommand.dy ?? 0,
          speed: payload.speed ?? pcCommand.speed ?? 1,
        }

      case PC_CMD_TYPES.STOP:
        return { id: cmdId, type: CAR_CMD.STOP }

      case PC_CMD_TYPES.LIFT_UP:
        return { id: cmdId, type: CAR_CMD.LIFT_UP }

      case PC_CMD_TYPES.LIFT_DOWN:
        return { id: cmdId, type: CAR_CMD.LIFT_DOWN }

      case PC_CMD_TYPES.LIFT_STOP:
        return { id: cmdId, type: CAR_CMD.LIFT_STOP }

      case PC_CMD_TYPES.ESTOP:
        return { id: cmdId, type: CAR_CMD.ESTOP }

      case PC_CMD_TYPES.RESET:
        return { id: cmdId, type: CAR_CMD.RESET }

      case PC_CMD_TYPES.PING:
      case PC_CMD_TYPES.SYNC:
        return { id: cmdId, type: CAR_CMD.PING }

      // 控制权命令只影响 App 仲裁器，不一定需要下发到小车。
      case PC_CMD_TYPES.TAKEOVER:
      case PC_CMD_TYPES.RELEASE:
        return null

      default:
        console.warn(`[CommandMapper] 未知命令类型: ${type}`)
        return null
    }
  }
}
