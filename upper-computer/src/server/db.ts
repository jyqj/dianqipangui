import Database from "better-sqlite3";
import path from "path";
import { hashPasswordSync } from "./auth";

const DB_PATH = process.env.DB_PATH || "./data/upper-computer.db";
const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(path.resolve(DB_PATH));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function initDatabase(): void {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS workers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'operator',
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      target_x REAL,
      target_y REAL,
      target_node TEXT,
      assigned_worker_id INTEGER REFERENCES workers(id),
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      finished_at DATETIME,
      duration_s INTEGER,
      result_note TEXT
    );

    CREATE TABLE IF NOT EXISTS order_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      event_type TEXT NOT NULL,
      message TEXT,
      payload_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS command_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cmd_id TEXT UNIQUE NOT NULL,
      order_id TEXT,
      command_type TEXT NOT NULL,
      payload_json TEXT,
      status TEXT DEFAULT 'created',
      app_ack INTEGER DEFAULT 0,
      car_ack INTEGER DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS telemetry_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      mode TEXT,
      move_state TEXT,
      lift_state TEXT,
      estimated_x REAL,
      estimated_y REAL,
      progress_pct INTEGER,
      battery_v REAL,
      obstacle_cm INTEGER,
      rssi INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS alarms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id),
      code TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT,
      source TEXT,
      handled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER REFERENCES workers(id),
      socket_id TEXT,
      app_version TEXT,
      connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      disconnected_at DATETIME,
      ble_connected INTEGER DEFAULT 0,
      simulate_mode INTEGER DEFAULT 1
    );
  `);

  // 插入默认管理员（如果不存在）
  const adminExists = database
    .prepare("SELECT id FROM workers WHERE worker_no = ?")
    .get("admin");

  if (!adminExists) {
    const hash = hashPasswordSync(DEFAULT_ADMIN_PASSWORD);
    database
      .prepare(
        "INSERT INTO workers (worker_no, name, password_hash, role) VALUES (?, ?, ?, ?)"
      )
      .run("admin", "管理员", hash, "admin");
    console.log(`[DB] 已创建默认管理员: admin / ${DEFAULT_ADMIN_PASSWORD}`);
    if (!process.env.DEFAULT_ADMIN_PASSWORD) {
      console.warn("[DB] 当前使用默认管理员密码，生产/现场环境请设置 DEFAULT_ADMIN_PASSWORD 后重建初始管理员。");
    }
  }

  console.log("[DB] 数据库初始化完成");
}
