export enum OrderStatus {
  DRAFT = "draft",
  PENDING = "pending",
  DISPATCHING = "dispatching",
  RUNNING = "running",
  PAUSED = "paused",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export enum CommandType {
  ORDER_START = "order_start",
  ORDER_PAUSE = "order_pause",
  ORDER_RESUME = "order_resume",
  ORDER_CANCEL = "order_cancel",
  ESTOP = "estop",
  TAKEOVER = "takeover",
  RELEASE = "release",
  SYNC = "sync",
}

export enum AlarmCode {
  ESTOP_LOCAL = "ESTOP_LOCAL",
  ESTOP_REMOTE = "ESTOP_REMOTE",
  BLE_LOST = "BLE_LOST",
  PC_LOST = "PC_LOST",
  OBSTACLE = "OBSTACLE",
  LOW_BATTERY = "LOW_BATTERY",
  LIMIT_HIT = "LIMIT_HIT",
  COMMAND_TIMEOUT = "COMMAND_TIMEOUT",
  APP_OFFLINE = "APP_OFFLINE",
}

export enum AlarmLevel {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export enum ControlOwner {
  APP_MANUAL = "app_manual",
  PC_AUTO = "pc_auto",
  PC_TAKEOVER = "pc_takeover",
  ESTOP = "estop",
  FAULT = "fault",
}

export const OrderStatusLabel: Record<string, string> = {
  [OrderStatus.DRAFT]: "草稿",
  [OrderStatus.PENDING]: "待执行",
  [OrderStatus.DISPATCHING]: "下发中",
  [OrderStatus.RUNNING]: "执行中",
  [OrderStatus.PAUSED]: "已暂停",
  [OrderStatus.COMPLETED]: "已完成",
  [OrderStatus.FAILED]: "已失败",
  [OrderStatus.CANCELLED]: "已取消",
};

export const AlarmLevelLabel: Record<string, string> = {
  [AlarmLevel.INFO]: "信息",
  [AlarmLevel.WARNING]: "警告",
  [AlarmLevel.CRITICAL]: "严重",
};

export const AlarmCodeLabel: Record<string, string> = {
  [AlarmCode.ESTOP_LOCAL]: "本地急停",
  [AlarmCode.ESTOP_REMOTE]: "远程急停",
  [AlarmCode.BLE_LOST]: "蓝牙断开",
  [AlarmCode.PC_LOST]: "上位机断开",
  [AlarmCode.OBSTACLE]: "障碍物检测",
  [AlarmCode.LOW_BATTERY]: "低电量",
  [AlarmCode.LIMIT_HIT]: "限位触发",
  [AlarmCode.COMMAND_TIMEOUT]: "命令超时",
  [AlarmCode.APP_OFFLINE]: "APP离线",
};
