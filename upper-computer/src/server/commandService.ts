import { getDb } from "./db";
import type { Command, CommandLog } from "../shared/protocol";

function generateCmdId(): string {
  const rand = Math.random().toString(36).substring(2, 6);
  return `cmd_${Date.now()}_${rand}`;
}

export function createCommand(
  type: string,
  orderId: string | null,
  payload: Record<string, unknown>
): Command {
  const cmdId = generateCmdId();
  const now = Date.now();

  const db = getDb();
  db.prepare(
    `INSERT INTO command_logs (cmd_id, order_id, command_type, payload_json, status)
     VALUES (?, ?, ?, ?, 'created')`
  ).run(cmdId, orderId, type, JSON.stringify(payload));

  return {
    cmd_id: cmdId,
    type,
    priority: priorityFor(type),
    need_ack: true,
    order_id: orderId || undefined,
    payload,
    ts: now,
  };
}

function priorityFor(type: string): number {
  if (type === "estop") return 100;
  if (type === "takeover") return 90;
  if (type === "order_cancel") return 70;
  if (type === "order_pause") return 60;
  if (type === "order_start" || type === "order_resume") return 50;
  return 10;
}

export function markCommandSent(cmdId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE command_logs SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE cmd_id = ?`
  ).run(cmdId);
}

export function markCommandTimeout(cmdId: string, msg: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE command_logs
     SET status = 'timeout', error_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE cmd_id = ? AND status NOT IN ('completed', 'failed')`
  ).run(msg, cmdId);
}

export function markCommandFailed(cmdId: string, msg: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE command_logs
     SET status = 'failed', error_message = ?, updated_at = CURRENT_TIMESTAMP
     WHERE cmd_id = ?`
  ).run(msg, cmdId);
}

function normalizeAckStage(stage: string): "app_ack" | "car_ack" | "done" | "unknown" {
  if (["app_ack", "app_received", "received"].includes(stage)) return "app_ack";
  if (["car_ack", "car_started", "car_executed"].includes(stage)) return "car_ack";
  if (["done", "completed", "failed"].includes(stage)) return "done";
  return "unknown";
}

export function handleAck(
  cmdId: string,
  stage: string,
  ok: boolean,
  msg: string
): { stage: "app_ack" | "car_ack" | "done" | "unknown"; status: string } {
  const db = getDb();
  const normalizedStage = normalizeAckStage(stage);

  if (normalizedStage === "app_ack") {
    const status = ok ? "app_acked" : "app_rejected";
    db.prepare(
      `UPDATE command_logs SET app_ack = ?, status = ?, error_message = CASE WHEN ? = 0 THEN ? ELSE error_message END, updated_at = CURRENT_TIMESTAMP
       WHERE cmd_id = ?`
    ).run(ok ? 1 : 0, status, ok ? 1 : 0, msg, cmdId);
    return { stage: normalizedStage, status };
  }

  if (normalizedStage === "car_ack") {
    const status = ok ? "car_acked" : "car_rejected";
    db.prepare(
      `UPDATE command_logs SET car_ack = ?, status = ?, error_message = CASE WHEN ? = 0 THEN ? ELSE error_message END, updated_at = CURRENT_TIMESTAMP
       WHERE cmd_id = ?`
    ).run(ok ? 1 : 0, status, ok ? 1 : 0, msg, cmdId);
    return { stage: normalizedStage, status };
  }

  if (normalizedStage === "done") {
    const status = ok ? "completed" : "failed";
    db.prepare(
      `UPDATE command_logs SET status = ?, error_message = CASE WHEN ? = 0 THEN ? ELSE error_message END, updated_at = CURRENT_TIMESTAMP WHERE cmd_id = ?`
    ).run(status, ok ? 1 : 0, msg, cmdId);
    return { stage: normalizedStage, status };
  }

  return { stage: normalizedStage, status: "unknown_ack" };
}

export function getRecentCommands(limit: number = 20): CommandLog[] {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM command_logs ORDER BY created_at DESC LIMIT ?"
    )
    .all(safeLimit) as CommandLog[];
}

export function getCommandsByOrderId(orderId: string): CommandLog[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM command_logs WHERE order_id = ? ORDER BY created_at DESC"
    )
    .all(orderId) as CommandLog[];
}
