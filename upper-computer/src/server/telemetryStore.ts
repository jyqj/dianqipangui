import type { TelemetryFrame, BridgeState } from "../shared/protocol";
import { getDb } from "./db";

interface TelemetryState {
  telemetry: TelemetryFrame | null;
  bridgeState: BridgeState | null;
  lastSampleTime: number;
}

const SAMPLE_INTERVAL_MS = 5000; // 5秒采样

const state: TelemetryState = {
  telemetry: null,
  bridgeState: null,
  lastSampleTime: 0,
};

export function updateTelemetry(frame: TelemetryFrame): void {
  state.telemetry = frame;

  const now = Date.now();
  if (now - state.lastSampleTime >= SAMPLE_INTERVAL_MS) {
    state.lastSampleTime = now;
    try {
      const db = getDb();
      db.prepare(
        `INSERT INTO telemetry_logs (order_id, mode, move_state, lift_state, estimated_x, estimated_y, progress_pct, battery_v, obstacle_cm, rssi)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        frame.order_id || null,
        frame.mode,
        frame.move_state,
        frame.lift_state,
        frame.estimated_x,
        frame.estimated_y,
        frame.progress_pct,
        frame.battery_v,
        frame.obstacle_cm,
        frame.rssi
      );
    } catch (err) {
      console.error("[TelemetryStore] 写入遥测日志失败:", err);
    }
  }
}

export function updateBridgeState(bs: BridgeState): void {
  state.bridgeState = bs;
}

export function getTelemetry(): TelemetryFrame | null {
  return state.telemetry;
}

export function getBridgeState(): BridgeState | null {
  return state.bridgeState;
}

export function getFullState(): TelemetryState {
  return { ...state };
}
