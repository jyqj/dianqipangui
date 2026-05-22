export interface TelemetryFrame {
  mode: string;
  move_state: string;
  lift_state: string;
  estimated_x: number;
  estimated_y: number;
  progress_pct: number;
  battery_v: number;
  obstacle_cm: number;
  rssi: number;
  order_id?: number;
  ts: number;
}

export interface BridgeState {
  ble_connected: boolean;
  ble_device_name: string;
  app_version: string;
  battery_level: number;
  signal_strength: number;
}

export interface Command {
  cmd_id: string;
  type: string;
  priority: number;
  need_ack: boolean;
  order_id?: string;
  payload: Record<string, unknown>;
  ts: number;
}

export interface CommandAck {
  cmd_id: string;
  stage: string;
  ok: boolean;
  msg: string;
}

export interface AlarmEvent {
  code: string;
  level: string;
  msg: string;
  source: string;
  order_id?: number;
  ts: number;
}

export interface OrderData {
  id?: number;
  order_no?: string;
  title: string;
  target_x?: number;
  target_y?: number;
  target_node?: string;
  assigned_worker_id?: number;
  status?: string;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  duration_s?: number;
  result_note?: string;
}

export interface WorkerData {
  id?: number;
  worker_no: string;
  name: string;
  password?: string;
  role: string;
  phone?: string;
  created_at?: string;
}

export interface CommandLog {
  id?: number;
  cmd_id: string;
  order_id?: string;
  command_type: string;
  payload_json?: string;
  status: string;
  app_ack: number;
  car_ack: number;
  error_message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AlarmRecord {
  id?: number;
  order_id?: number;
  code: string;
  level: string;
  message?: string;
  source?: string;
  handled: number;
  created_at?: string;
}

export interface OrderEvent {
  id?: number;
  order_id: number;
  event_type: string;
  message?: string;
  payload_json?: string;
  created_at?: string;
}
