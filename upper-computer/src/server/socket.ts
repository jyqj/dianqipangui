import { Server, Socket } from "socket.io";
import { getDb } from "./db";
import { verifyPasswordSync, generateToken, verifyToken, hashPasswordSync } from "./auth";
import {
  createCommand,
  handleAck,
  getRecentCommands,
  markCommandSent,
  markCommandTimeout,
  markCommandFailed,
} from "./commandService";
import {
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  getTodayStats,
} from "./orderService";
import {
  updateTelemetry,
  updateBridgeState,
  getTelemetry,
  getBridgeState,
} from "./telemetryStore";
import type { TelemetryFrame, BridgeState, CommandAck, AlarmEvent, Command } from "../shared/protocol";

interface WorkerRow {
  id: number;
  worker_no: string;
  name: string;
  password_hash: string;
  role: string;
  phone?: string | null;
}

type AckCallback = ((data: unknown) => void) | undefined;

const APP_ACK_TIMEOUT_MS = Number(process.env.APP_ACK_TIMEOUT_MS || 3000);
const APP_ACK_MAX_RETRY = Number(process.env.APP_ACK_MAX_RETRY || 3);

// 当前系统只允许一台 App 作为现场桥接层；后续如支持多车，需要改成 app registry。
let appSocketId: string | null = null;

const pendingAppAcks = new Map<
  string,
  { cmd: Command; attempts: number; timer: NodeJS.Timeout }
>();

function getWorkerByNo(workerNo: string): WorkerRow | null {
  const db = getDb();
  return db
    .prepare("SELECT * FROM workers WHERE worker_no = ?")
    .get(workerNo) as WorkerRow | null;
}

function publicWorker(worker: WorkerRow) {
  return {
    id: worker.id,
    worker_no: worker.worker_no,
    worker_id: worker.worker_no,
    name: worker.name,
    worker_name: worker.name,
    role: worker.role,
  };
}

function buildAuthResult(worker: WorkerRow) {
  const token = generateToken({
    sub: worker.id,
    worker_no: worker.worker_no,
    name: worker.name,
    role: worker.role,
  });
  return {
    ok: true,
    status: "ok",
    msg: "认证成功",
    message: "认证成功",
    token,
    worker: publicWorker(worker),
    worker_id: worker.worker_no,
    worker_no: worker.worker_no,
    worker_name: worker.name,
    role: worker.role,
  };
}

function failAuthResult(msg: string) {
  return { ok: false, status: "fail", msg, message: msg };
}

function isAdminToken(token: string | undefined): { ok: boolean; payload?: Record<string, unknown> } {
  if (!token) return { ok: false };
  const payload = verifyToken(token);
  if (!payload || payload.role !== "admin") return { ok: false };
  return { ok: true, payload };
}

function authenticateWebSocket(socket: Socket, payload: Record<string, unknown>): void {
  socket.data.webAuthenticated = true;
  socket.data.webUser = {
    id: payload.sub,
    worker_no: payload.worker_no,
    name: payload.name,
    role: payload.role,
  };
  socket.join("web_clients");
}

function requireWeb(socket: Socket, callback?: AckCallback): boolean {
  if (socket.data.webAuthenticated) return true;
  const result = { ok: false, msg: "Web 管理端未认证" };
  if (callback) callback(result);
  socket.emit("server:web_auth_required", result);
  return false;
}

function safeLimit(limit: unknown, fallback = 100, max = 500): number {
  const value = Number(limit || fallback);
  return Math.max(1, Math.min(Number.isFinite(value) ? value : fallback, max));
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function normalizeTelemetry(raw: Record<string, unknown>): TelemetryFrame {
  const estimatedPos = raw.estimatedPos as { x?: unknown; y?: unknown } | undefined;
  const estimated_pos = raw.estimated_pos as { x?: unknown; y?: unknown } | undefined;
  return {
    mode: str(raw.mode, "idle"),
    move_state: str(raw.move_state ?? raw.moveState, "idle"),
    lift_state: str(raw.lift_state ?? raw.liftState, "idle"),
    estimated_x: num(raw.estimated_x ?? estimatedPos?.x ?? estimated_pos?.x, 0),
    estimated_y: num(raw.estimated_y ?? estimatedPos?.y ?? estimated_pos?.y, 0),
    progress_pct: num(raw.progress_pct ?? raw.progressPct, 0),
    battery_v: num(raw.battery_v ?? raw.batteryV, 0),
    obstacle_cm: num(raw.obstacle_cm ?? raw.obstacleCm, 999),
    rssi: num(raw.rssi ?? raw.bleRssi, 0),
    order_id: raw.order_id !== undefined || raw.orderId !== undefined ? num(raw.order_id ?? raw.orderId) : undefined,
    ts: num(raw.ts, Date.now()),
  };
}

function normalizeBridgeState(raw: Record<string, unknown>): BridgeState {
  return {
    ble_connected: Boolean(raw.ble_connected ?? raw.bleConnected),
    ble_device_name: str(raw.ble_device_name ?? raw.bleDeviceName, ""),
    simulate_mode: Boolean(raw.simulate_mode ?? raw.simulateMode),
    app_version: str(raw.app_version ?? raw.appVersion, "unknown"),
    battery_level: num(raw.battery_level ?? raw.batteryLevel, 0),
    signal_strength: num(raw.signal_strength ?? raw.signalStrength ?? raw.rssi, 0),
  };
}

function normalizeAlarm(raw: Record<string, unknown>): AlarmEvent {
  return {
    code: str(raw.code, "UNKNOWN"),
    level: str(raw.level, "info"),
    msg: str(raw.msg ?? raw.message, ""),
    source: str(raw.source, "app"),
    order_id: raw.order_id !== undefined || raw.orderId !== undefined ? num(raw.order_id ?? raw.orderId) : undefined,
    ts: num(raw.ts, Date.now()),
  };
}

function emitCurrentWebState(socket: Socket): void {
  const telemetry = getTelemetry();
  const bridgeState = getBridgeState();
  if (telemetry) socket.emit("server:telemetry", telemetry);
  if (bridgeState) socket.emit("server:bridge_state", bridgeState);
  socket.emit("server:app_status", { online: appSocketId !== null });
}

function emitCommandToApp(io: Server, cmd: Command): { ok: boolean; msg?: string } {
  if (!appSocketId) {
    markCommandFailed(cmd.cmd_id, "App 未在线，命令未发送");
    return { ok: false, msg: "App 未在线" };
  }

  markCommandSent(cmd.cmd_id);
  io.to("app").emit("pc:command", cmd);
  scheduleAppAckTimeout(io, cmd, 1);
  return { ok: true };
}

function scheduleAppAckTimeout(io: Server, cmd: Command, attempts: number): void {
  const old = pendingAppAcks.get(cmd.cmd_id);
  if (old) clearTimeout(old.timer);

  const timer = setTimeout(() => {
    const pending = pendingAppAcks.get(cmd.cmd_id);
    if (!pending) return;

    if (pending.attempts < APP_ACK_MAX_RETRY && appSocketId) {
      const nextAttempt = pending.attempts + 1;
      io.to("app").emit("pc:command", cmd);
      io.to("web_clients").emit("server:command_updated", {
        cmd_id: cmd.cmd_id,
        stage: "retry",
        ok: true,
        msg: `App ACK 超时，重发第 ${nextAttempt} 次`,
      });
      scheduleAppAckTimeout(io, cmd, nextAttempt);
      return;
    }

    pendingAppAcks.delete(cmd.cmd_id);
    markCommandTimeout(cmd.cmd_id, "App ACK 超时");
    io.to("web_clients").emit("server:command_updated", {
      cmd_id: cmd.cmd_id,
      stage: "timeout",
      ok: false,
      msg: "App ACK 超时",
    });
  }, APP_ACK_TIMEOUT_MS);

  pendingAppAcks.set(cmd.cmd_id, { cmd, attempts, timer });
}

function clearPendingAppAck(cmdId: string): void {
  const pending = pendingAppAcks.get(cmdId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingAppAcks.delete(cmdId);
  }
}

export function initSocket(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] 新连接: ${socket.id}`);

    // ===== 认证 =====

    socket.on(
      "app:auth",
      (data: { worker_no?: string; worker_id?: string; password: string }, callback?: (result: unknown) => void) => {
        const workerNo = data.worker_no || data.worker_id;
        const worker = workerNo ? getWorkerByNo(workerNo) : null;

        if (!worker || !verifyPasswordSync(data.password, worker.password_hash)) {
          const result = failAuthResult("用户名或密码错误");
          socket.emit("pc:auth_result", result);
          if (callback) callback(result);
          return;
        }

        socket.data.appAuthenticated = true;
        socket.data.worker = publicWorker(worker);
        socket.join("app");
        appSocketId = socket.id;

        const result = buildAuthResult(worker);
        socket.emit("pc:auth_result", result);
        if (callback) callback(result);

        io.to("web_clients").emit("server:app_online", {
          worker_no: worker.worker_no,
          name: worker.name,
        });

        console.log(`[Socket] APP 认证成功: ${worker.name}`);
      }
    );

    socket.on(
      "web:login",
      (data: { worker_no?: string; worker_id?: string; password: string }, callback?: (result: unknown) => void) => {
        const workerNo = data.worker_no || data.worker_id;
        const worker = workerNo ? getWorkerByNo(workerNo) : null;

        if (!worker || !verifyPasswordSync(data.password, worker.password_hash)) {
          const result = failAuthResult("管理员账号或密码错误");
          if (callback) callback(result);
          return;
        }

        if (worker.role !== "admin") {
          const result = failAuthResult("仅管理员可登录上位机管理端");
          if (callback) callback(result);
          return;
        }

        const result = buildAuthResult(worker);
        authenticateWebSocket(socket, {
          sub: worker.id,
          worker_no: worker.worker_no,
          name: worker.name,
          role: worker.role,
        });
        emitCurrentWebState(socket);
        if (callback) callback(result);
      }
    );

    socket.on("web:join", (data?: { token?: string }, callback?: AckCallback) => {
      const token = data?.token;
      const tokenResult = isAdminToken(token);
      if (!tokenResult.ok || !tokenResult.payload) {
        const result = { ok: false, msg: "Web 管理端未认证" };
        socket.emit("server:web_auth_required", result);
        if (callback) callback(result);
        return;
      }

      authenticateWebSocket(socket, tokenResult.payload);
      console.log(`[Socket] Web 客户端加入: ${socket.id}`);
      emitCurrentWebState(socket);
      if (callback) callback({ ok: true, user: socket.data.webUser });
    });

    socket.on("web:logout", (callback?: AckCallback) => {
      socket.leave("web_clients");
      socket.data.webAuthenticated = false;
      socket.data.webUser = null;
      if (callback) callback({ ok: true });
    });

    // ===== APP 端事件 =====

    socket.on(
      "app:hello",
      (data: { app_version: string; worker_id?: number; simulate_mode?: boolean }) => {
        if (!socket.data.appAuthenticated) return;
        const db = getDb();
        db.prepare(
          "INSERT INTO app_sessions (worker_id, socket_id, app_version, simulate_mode) VALUES (?, ?, ?, ?)"
        ).run(data.worker_id || null, socket.id, data.app_version, data.simulate_mode ? 1 : 0);
        console.log(`[Socket] APP hello: v${data.app_version}`);
      }
    );

    socket.on("app:bridge_state", (data: Record<string, unknown>) => {
      if (!socket.data.appAuthenticated) return;
      const normalized = normalizeBridgeState(data);
      updateBridgeState(normalized);

      const db = getDb();
      db.prepare(
        "UPDATE app_sessions SET ble_connected = ?, simulate_mode = ? WHERE socket_id = ? AND disconnected_at IS NULL"
      ).run(normalized.ble_connected ? 1 : 0, normalized.simulate_mode ? 1 : 0, socket.id);

      io.to("web_clients").emit("server:bridge_state", normalized);
    });

    socket.on("app:telemetry", (data: Record<string, unknown>) => {
      if (!socket.data.appAuthenticated) return;
      const normalized = normalizeTelemetry(data);
      updateTelemetry(normalized);
      io.to("web_clients").emit("server:telemetry", normalized);
    });

    socket.on("app:alarm", (data: Record<string, unknown>) => {
      if (!socket.data.appAuthenticated) return;
      const alarm = normalizeAlarm(data);
      const db = getDb();
      db.prepare(
        "INSERT INTO alarms (order_id, code, level, message, source) VALUES (?, ?, ?, ?, ?)"
      ).run(alarm.order_id || null, alarm.code, alarm.level, alarm.msg, alarm.source);

      io.to("web_clients").emit("server:alarm", alarm);
      console.log(`[Socket] 报警: [${alarm.level}] ${alarm.code} - ${alarm.msg}`);
    });

    socket.on("app:cmd_ack", (data: CommandAck & { status?: string; message?: string }) => {
      if (!socket.data.appAuthenticated) return;
      const ok = typeof data.ok === "boolean" ? data.ok : data.status === "ok";
      const msg = data.msg || data.message || "";
      const result = handleAck(data.cmd_id, data.stage || data.status || "unknown", ok, msg);
      if (result.stage === "app_ack") clearPendingAppAck(data.cmd_id);

      io.to("web_clients").emit("server:command_updated", {
        cmd_id: data.cmd_id,
        stage: result.stage,
        status: result.status,
        ok,
        msg,
      });
    });

    socket.on(
      "app:order_event",
      (data: {
        order_id?: number;
        orderId?: number;
        event_type?: string;
        type?: string;
        status?: string;
        message?: string;
        result?: unknown;
      }) => {
        if (!socket.data.appAuthenticated) return;
        const orderId = data.order_id ?? data.orderId;
        if (!orderId) return;

        const eventType = data.event_type || data.type || "event";
        const status = data.status || (eventType === "completed" ? "completed" : undefined);
        const message = data.message || `App 事件: ${eventType}`;

        if (status) {
          updateOrderStatus(orderId, status, message);
        }

        const db = getDb();
        db.prepare(
          "INSERT INTO order_events (order_id, event_type, message, payload_json) VALUES (?, ?, ?, ?)"
        ).run(orderId, eventType, message, JSON.stringify(data.result ?? data));

        const { order } = getOrder(orderId);
        io.to("web_clients").emit("server:order_updated", order);
      }
    );

    // ===== Web 端事件 =====

    socket.on(
      "web:get_orders",
      (filter: { status?: string; date_from?: string; date_to?: string } = {}, callback: (data: unknown) => void) => {
        if (!requireWeb(socket, callback)) return;
        callback(getOrders(filter));
      }
    );

    socket.on("web:get_order", (id: number, callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      callback(getOrder(Number(id)));
    });

    socket.on("web:create_order", (data: Record<string, unknown>, callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      const order = createOrder(data);
      io.to("web_clients").emit("server:order_updated", order);
      callback(order);
    });

    socket.on("web:update_order", (data: { id: number } & Record<string, unknown>, callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      updateOrder(Number(data.id), data);
      const { order } = getOrder(Number(data.id));
      io.to("web_clients").emit("server:order_updated", order);
      callback(order);
    });

    socket.on("web:delete_order", (id: number, callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      const ok = deleteOrder(Number(id));
      callback({ ok });
      if (ok) io.to("web_clients").emit("server:order_deleted", id);
    });

    socket.on("web:start_order", (orderId: number, callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const { order } = getOrder(Number(orderId));
      if (!order) {
        if (callback) callback({ ok: false, msg: "工单不存在" });
        return;
      }

      const cmd = createCommand("order_start", String(orderId), {
        order_id: Number(orderId),
        order_no: order.order_no,
        title: order.title,
        target_x: order.target_x,
        target_y: order.target_y,
        target_node: order.target_node,
      });

      const sendResult = emitCommandToApp(io, cmd);
      if (!sendResult.ok) {
        if (callback) callback(sendResult);
        return;
      }

      updateOrderStatus(Number(orderId), "dispatching", "工单已下发到 App");
      const updated = getOrder(Number(orderId));
      io.to("web_clients").emit("server:order_updated", updated.order);
      io.to("web_clients").emit("server:command_created", cmd);
      if (callback) callback({ ok: true, cmd_id: cmd.cmd_id });
      console.log(`[Socket] 启动工单: ${order.order_no}, cmd: ${cmd.cmd_id}`);
    });

    socket.on("web:pause_order", (orderId: number, callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const cmd = createCommand("order_pause", String(orderId), { order_id: Number(orderId) });
      const sendResult = emitCommandToApp(io, cmd);
      if (callback) callback(sendResult.ok ? { ok: true, cmd_id: cmd.cmd_id } : sendResult);
    });

    socket.on("web:resume_order", (orderId: number, callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const cmd = createCommand("order_resume", String(orderId), { order_id: Number(orderId) });
      const sendResult = emitCommandToApp(io, cmd);
      if (callback) callback(sendResult.ok ? { ok: true, cmd_id: cmd.cmd_id } : sendResult);
    });

    socket.on("web:cancel_order", (orderId: number, callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const cmd = createCommand("order_cancel", String(orderId), { order_id: Number(orderId) });
      const sendResult = emitCommandToApp(io, cmd);
      if (sendResult.ok) updateOrderStatus(Number(orderId), "cancelled", "管理员取消工单");
      const updated = getOrder(Number(orderId));
      io.to("web_clients").emit("server:order_updated", updated.order);
      if (callback) callback(sendResult.ok ? { ok: true, cmd_id: cmd.cmd_id } : sendResult);
    });

    socket.on("web:estop", (callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const cmd = createCommand("estop", null, { reason: "web_manual" });
      const sendResult = emitCommandToApp(io, cmd);
      io.to("web_clients").emit("server:command_created", cmd);
      if (callback) callback(sendResult.ok ? { ok: true, cmd_id: cmd.cmd_id } : sendResult);
      console.log("[Socket] 急停命令已发送");
    });

    socket.on("web:takeover", (callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const cmd = createCommand("takeover", null, { reason: "web_takeover" });
      const sendResult = emitCommandToApp(io, cmd);
      io.to("web_clients").emit("server:command_created", cmd);
      if (callback) callback(sendResult.ok ? { ok: true, cmd_id: cmd.cmd_id } : sendResult);
    });

    socket.on("web:release", (callback?: AckCallback) => {
      if (!requireWeb(socket, callback)) return;
      const cmd = createCommand("release", null, { reason: "web_release" });
      const sendResult = emitCommandToApp(io, cmd);
      if (callback) callback(sendResult.ok ? { ok: true, cmd_id: cmd.cmd_id } : sendResult);
    });

    socket.on("web:get_commands", (limit: number, callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      callback(getRecentCommands(safeLimit(limit, 20, 100)));
    });

    socket.on(
      "web:get_alarms",
      (filter: { level?: string; code?: string; date_from?: string; date_to?: string; limit?: number } = {}, callback: (data: unknown) => void) => {
        if (!requireWeb(socket, callback)) return;
        const db = getDb();
        let sql = "SELECT * FROM alarms WHERE 1=1";
        const params: unknown[] = [];

        if (filter?.level) {
          sql += " AND level = ?";
          params.push(filter.level);
        }
        if (filter?.code) {
          sql += " AND code = ?";
          params.push(filter.code);
        }
        if (filter?.date_from) {
          sql += " AND created_at >= ?";
          params.push(filter.date_from);
        }
        if (filter?.date_to) {
          sql += " AND created_at <= ?";
          params.push(filter.date_to + " 23:59:59");
        }

        sql += " ORDER BY created_at DESC LIMIT ?";
        params.push(safeLimit(filter?.limit, 100, 500));
        callback(db.prepare(sql).all(...params));
      }
    );

    socket.on("web:get_workers", (callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      const db = getDb();
      const workers = db
        .prepare(
          "SELECT id, worker_no, name, role, phone, created_at FROM workers ORDER BY created_at DESC"
        )
        .all();
      callback(workers);
    });

    socket.on(
      "web:create_worker",
      (data: { worker_no: string; name: string; password: string; role: string; phone?: string }, callback: (data: unknown) => void) => {
        if (!requireWeb(socket, callback)) return;
        const db = getDb();
        try {
          if (!data.worker_no || !data.name || !data.password) throw new Error("工号、姓名和密码必填");
          const role = data.role === "admin" ? "admin" : "operator";
          const hash = hashPasswordSync(data.password);
          db.prepare(
            "INSERT INTO workers (worker_no, name, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)"
          ).run(data.worker_no, data.name, hash, role, data.phone || null);
          callback({ ok: true });
        } catch (err: unknown) {
          callback({ ok: false, msg: (err as Error).message });
        }
      }
    );

    socket.on(
      "web:update_worker",
      (data: { id: number; name?: string; role?: string; phone?: string }, callback: (data: unknown) => void) => {
        if (!requireWeb(socket, callback)) return;
        const db = getDb();
        const role = data.role === "admin" ? "admin" : data.role === "operator" ? "operator" : null;
        db.prepare(
          "UPDATE workers SET name = COALESCE(?, name), role = COALESCE(?, role), phone = COALESCE(?, phone) WHERE id = ?"
        ).run(data.name ?? null, role, data.phone ?? null, Number(data.id));
        callback({ ok: true });
      }
    );

    socket.on("web:delete_worker", (id: number, callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      const db = getDb();
      try {
        db.prepare("DELETE FROM workers WHERE id = ? AND worker_no != 'admin'").run(Number(id));
        callback({ ok: true });
      } catch (err: unknown) {
        callback({ ok: false, msg: (err as Error).message });
      }
    });

    socket.on(
      "web:reset_password",
      (data: { id: number; password: string }, callback: (data: unknown) => void) => {
        if (!requireWeb(socket, callback)) return;
        if (!data.password || data.password.length < 6) {
          callback({ ok: false, msg: "密码至少 6 位" });
          return;
        }
        const db = getDb();
        const hash = hashPasswordSync(data.password);
        db.prepare("UPDATE workers SET password_hash = ? WHERE id = ?").run(hash, Number(data.id));
        callback({ ok: true });
      }
    );

    socket.on("web:get_today_stats", (callback: (data: unknown) => void) => {
      if (!requireWeb(socket, callback)) return;
      callback(getTodayStats());
    });

    socket.on(
      "web:get_history_stats",
      (data: { days?: number } = {}, callback: (data: unknown) => void) => {
        if (!requireWeb(socket, callback)) return;
        const db = getDb();
        const days = safeLimit(data?.days, 7, 365);
        const dateFrom = new Date();
        dateFrom.setDate(dateFrom.getDate() - days);
        const fromStr = dateFrom.toISOString().split("T")[0];

        const orderStats = db
          .prepare(
            `SELECT DATE(created_at) as date, status, COUNT(*) as cnt
             FROM orders WHERE created_at >= ?
             GROUP BY DATE(created_at), status
             ORDER BY date`
          )
          .all(fromStr);

        const alarmStats = db
          .prepare(
            `SELECT DATE(created_at) as date, level, COUNT(*) as cnt
             FROM alarms WHERE created_at >= ?
             GROUP BY DATE(created_at), level
             ORDER BY date`
          )
          .all(fromStr);

        callback({ orderStats, alarmStats });
      }
    );

    // ===== 断开连接 =====
    socket.on("disconnect", () => {
      console.log(`[Socket] 断开连接: ${socket.id}`);

      if (socket.id === appSocketId) {
        appSocketId = null;
        for (const [cmdId, pending] of pendingAppAcks) {
          clearTimeout(pending.timer);
          pendingAppAcks.delete(cmdId);
          markCommandTimeout(cmdId, "App 离线，命令中断");
        }

        const db = getDb();
        db.prepare(
          "UPDATE app_sessions SET disconnected_at = CURRENT_TIMESTAMP WHERE socket_id = ? AND disconnected_at IS NULL"
        ).run(socket.id);

        db.prepare(
          "INSERT INTO alarms (code, level, message, source) VALUES ('APP_OFFLINE', 'critical', 'APP已断开连接', 'system')"
        ).run();

        io.to("web_clients").emit("server:app_offline", {});
        io.to("web_clients").emit("server:alarm", {
          code: "APP_OFFLINE",
          level: "critical",
          msg: "APP已断开连接",
          source: "system",
          ts: Date.now(),
        });

        console.log("[Socket] APP 已离线");
      }
    });
  });

  console.log("[Socket] Socket.IO 服务已初始化");
}
