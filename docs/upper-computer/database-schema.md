# 数据库设计

## 1. 概述

使用 SQLite (better-sqlite3)，单文件数据库 `data/app.db`，首次运行自动建表。

## 2. 表结构

### 2.1 workers — 操作人员表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| worker_no | TEXT | UNIQUE NOT NULL | 工号 |
| name | TEXT | NOT NULL | 姓名 |
| password_hash | TEXT | NOT NULL | bcrypt 哈希 |
| role | TEXT | DEFAULT 'operator' | operator / admin |
| phone | TEXT | | 联系电话 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 2.2 orders — 工单表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| order_no | TEXT | UNIQUE NOT NULL | 工单编号 WO-YYYYMMDD-NNN |
| title | TEXT | NOT NULL | 盘柜名称/编号 |
| target_x | REAL | | 安装目标坐标 X |
| target_y | REAL | | 安装目标坐标 Y |
| target_node | TEXT | | 目标节点编号 |
| assigned_worker_id | INTEGER | REFERENCES workers(id) | 指派操作员 |
| status | TEXT | DEFAULT 'draft' | 工单状态 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| started_at | DATETIME | | 开始时间 |
| finished_at | DATETIME | | 完成时间 |
| duration_s | INTEGER | | 执行时长秒 |
| result_note | TEXT | | 结果备注 |

工单状态枚举：

| 状态 | 说明 |
|------|------|
| `draft` | 草稿 |
| `pending` | 待执行 |
| `dispatching` | 已下发，等待 App ACK |
| `running` | 执行中 |
| `paused` | 暂停 |
| `completed` | 完成 |
| `failed` | 失败 |
| `cancelled` | 取消 |

### 2.3 order_events — 工单事件表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| order_id | INTEGER | REFERENCES orders(id) | 关联工单 |
| event_type | TEXT | NOT NULL | 事件类型 |
| message | TEXT | | 事件描述 |
| payload_json | TEXT | | 附加数据 JSON |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 事件时间 |

### 2.4 command_logs — 命令日志表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| cmd_id | TEXT | UNIQUE NOT NULL | 命令 ID |
| order_id | TEXT | | 关联工单号 |
| command_type | TEXT | NOT NULL | 命令类型 |
| payload_json | TEXT | | 命令载荷 JSON |
| status | TEXT | DEFAULT 'created' | created/sent/acked/completed/failed/timeout |
| app_ack | INTEGER | DEFAULT 0 | App 是否确认 |
| car_ack | INTEGER | DEFAULT 0 | 小车是否确认 |
| error_message | TEXT | | 错误信息 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 更新时间 |

### 2.5 telemetry_logs — 遥测日志表（采样）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| order_id | INTEGER | REFERENCES orders(id) | 关联工单 |
| mode | TEXT | | 当前模式 |
| move_state | TEXT | | 运动状态 |
| lift_state | TEXT | | 推杆状态 |
| estimated_x | REAL | | 估计 X 坐标 |
| estimated_y | REAL | | 估计 Y 坐标 |
| progress_pct | INTEGER | | 进度百分比 |
| battery_v | REAL | | 电池电压 |
| obstacle_cm | INTEGER | | 障碍距离 |
| rssi | INTEGER | | BLE 信号强度 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 采样时间 |

### 2.6 alarms — 报警记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| order_id | INTEGER | REFERENCES orders(id) | 关联工单 |
| code | TEXT | NOT NULL | 报警代码 |
| level | TEXT | NOT NULL | info / warning / critical |
| message | TEXT | | 报警描述 |
| source | TEXT | | 来源：car / app / pc |
| handled | INTEGER | DEFAULT 0 | 是否已处理 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 报警时间 |

### 2.7 app_sessions — App 会话表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | 主键 |
| worker_id | INTEGER | REFERENCES workers(id) | 操作员 |
| socket_id | TEXT | | Socket.IO 连接 ID |
| app_version | TEXT | | App 版本 |
| connected_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 连接时间 |
| disconnected_at | DATETIME | | 断开时间 |
| ble_connected | INTEGER | DEFAULT 0 | BLE 是否连接 |

## 3. 写入策略

| 数据类型 | 写入时机 | 说明 |
|---------|---------|------|
| 工单状态变化 | 立即入库 | 每次状态切换都记录 |
| 命令下发和 ACK | 立即入库 | command_logs 全程记录 |
| 工单事件 | 立即入库 | order_events 追加 |
| 报警 | 立即入库 | alarms 表 |
| 实时遥测 | 内存保持，5 秒采样入库 | telemetryStore 内存 + telemetry_logs 采样 |
| App 会话 | 连接/断开时入库 | app_sessions 表 |

## 4. 初始数据

首次启动自动创建默认管理员：

```
worker_no: admin
name: 管理员
password: admin123 (bcrypt hash)
role: admin
```

## 5. SQL 建表语句

详见源码 `src/server/db.ts` 中的 `initDatabase()` 方法。
