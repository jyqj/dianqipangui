import { getDb } from "./db";
import type { OrderData, OrderEvent } from "../shared/protocol";

function generateOrderNo(): string {
  const db = getDb();
  const today = new Date();
  const dateStr =
    today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");

  const prefix = `WO-${dateStr}-`;
  const row = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM orders WHERE order_no LIKE ?"
    )
    .get(`${prefix}%`) as { cnt: number } | undefined;

  const seq = (row?.cnt || 0) + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export function createOrder(data: Partial<OrderData>): OrderData {
  const db = getDb();
  const orderNo = generateOrderNo();

  const result = db
    .prepare(
      `INSERT INTO orders (order_no, title, target_x, target_y, target_node, assigned_worker_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'draft')`
    )
    .run(
      orderNo,
      data.title || "未命名工单",
      data.target_x ?? null,
      data.target_y ?? null,
      data.target_node ?? null,
      data.assigned_worker_id ?? null
    );

  const order = db
    .prepare("SELECT * FROM orders WHERE id = ?")
    .get(result.lastInsertRowid) as OrderData;

  // 记录创建事件
  db.prepare(
    "INSERT INTO order_events (order_id, event_type, message) VALUES (?, 'created', '工单已创建')"
  ).run(result.lastInsertRowid);

  return order;
}

export function getOrders(filter?: {
  status?: string;
  date_from?: string;
  date_to?: string;
}): OrderData[] {
  const db = getDb();
  let sql = "SELECT o.*, w.name as worker_name FROM orders o LEFT JOIN workers w ON o.assigned_worker_id = w.id WHERE 1=1";
  const params: unknown[] = [];

  if (filter?.status) {
    sql += " AND o.status = ?";
    params.push(filter.status);
  }
  if (filter?.date_from) {
    sql += " AND o.created_at >= ?";
    params.push(filter.date_from);
  }
  if (filter?.date_to) {
    sql += " AND o.created_at <= ?";
    params.push(filter.date_to + " 23:59:59");
  }

  sql += " ORDER BY o.created_at DESC";

  return db.prepare(sql).all(...params) as OrderData[];
}

export function getOrder(id: number): {
  order: OrderData | null;
  events: OrderEvent[];
} {
  const db = getDb();
  const order = db
    .prepare(
      "SELECT o.*, w.name as worker_name FROM orders o LEFT JOIN workers w ON o.assigned_worker_id = w.id WHERE o.id = ?"
    )
    .get(id) as OrderData | null;

  const events = db
    .prepare(
      "SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at DESC"
    )
    .all(id) as OrderEvent[];

  return { order, events };
}

export function updateOrderStatus(
  id: number,
  status: string,
  note?: string
): void {
  const db = getDb();
  const now = new Date().toISOString();

  let extraSql = "";
  if (status === "running") {
    extraSql = ", started_at = ?";
  } else if (status === "completed" || status === "failed") {
    extraSql = ", finished_at = ?";
  }

  if (extraSql) {
    db.prepare(
      `UPDATE orders SET status = ?${extraSql} WHERE id = ?`
    ).run(status, now, id);
  } else {
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  }

  // 计算工时
  if (status === "completed" || status === "failed") {
    const order = db
      .prepare("SELECT started_at, finished_at FROM orders WHERE id = ?")
      .get(id) as { started_at: string; finished_at: string } | undefined;
    if (order?.started_at && order?.finished_at) {
      const duration = Math.round(
        (new Date(order.finished_at).getTime() -
          new Date(order.started_at).getTime()) /
          1000
      );
      db.prepare(
        "UPDATE orders SET duration_s = ?, result_note = ? WHERE id = ?"
      ).run(duration, note || null, id);
    }
  }

  // 记录事件
  db.prepare(
    "INSERT INTO order_events (order_id, event_type, message) VALUES (?, ?, ?)"
  ).run(id, `status_${status}`, note || `工单状态变更为: ${status}`);
}

export function updateOrder(id: number, data: Partial<OrderData>): void {
  const db = getDb();
  db.prepare(
    `UPDATE orders SET title = COALESCE(?, title), target_x = COALESCE(?, target_x), target_y = COALESCE(?, target_y), target_node = COALESCE(?, target_node), assigned_worker_id = COALESCE(?, assigned_worker_id) WHERE id = ?`
  ).run(
    data.title ?? null,
    data.target_x ?? null,
    data.target_y ?? null,
    data.target_node ?? null,
    data.assigned_worker_id ?? null,
    id
  );
}

export function deleteOrder(id: number): boolean {
  const db = getDb();
  const order = db
    .prepare("SELECT status FROM orders WHERE id = ?")
    .get(id) as { status: string } | undefined;

  if (!order) return false;
  if (order.status !== "draft" && order.status !== "pending") {
    return false;
  }

  db.prepare("DELETE FROM order_events WHERE order_id = ?").run(id);
  db.prepare("DELETE FROM orders WHERE id = ?").run(id);
  return true;
}

export function getTodayStats(): {
  total: number;
  completed: number;
  running: number;
  failed: number;
} {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const rows = db
    .prepare(
      "SELECT status, COUNT(*) as cnt FROM orders WHERE created_at >= ? GROUP BY status"
    )
    .all(today) as { status: string; cnt: number }[];

  const stats = { total: 0, completed: 0, running: 0, failed: 0 };
  for (const row of rows) {
    stats.total += row.cnt;
    if (row.status === "completed") stats.completed = row.cnt;
    if (row.status === "running") stats.running = row.cnt;
    if (row.status === "failed") stats.failed = row.cnt;
  }
  return stats;
}
