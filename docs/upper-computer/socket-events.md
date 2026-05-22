# Socket.IO 事件定义

## 1. 服务端架构

Socket.IO Server 挂载在自定义 Node HTTP Server 上，与 Next.js 共享同一端口。

```
HTTP Server (port 3000)
├── Next.js Handler (页面 + REST API)
└── Socket.IO Server (实时通信)
    ├── Room: "app"          — App 客户端
    ├── Room: "web_clients"  — Web 前端浏览器
    └── 默认                  — 未认证连接
```

配置：

```typescript
{
  cors: { origin: "*" },
  pingInterval: 1000,
  pingTimeout: 3000,
}
```

## 2. 连接生命周期

### 2.1 App 连接流程

```
App 建立 Socket.IO 连接
  → emit app:auth {worker_id, password}
    → 服务端校验
      → emit pc:auth_result {ok, token, role}
        → 认证成功：socket.join("app")
        → 认证失败：断开连接
  → emit app:hello {app_version}
    → 服务端记录 app_sessions
  → 开始周期上报 app:bridge_state (1s)
  → 开始周期上报 app:telemetry (500ms)
```

### 2.2 Web 前端连接流程

```
浏览器建立 Socket.IO 连接
  → emit web:join
    → socket.join("web_clients")
  → 开始接收 server:bridge_state / server:telemetry / server:alarm
```

### 2.3 断连处理

```
App 断开
  → 服务端记录 app_sessions.disconnected_at
  → 广播 server:alarm {code: "APP_OFFLINE"}
  → Web 前端显示 App 离线

Web 前端断开
  → 仅清理 room，无业务影响
```

## 3. 事件详细说明

### 3.1 App → 服务端

#### app:auth

```json
{
  "worker_id": "W001",
  "password": "123456"
}
```

#### app:hello

```json
{
  "app_version": "1.0.0",
  "device_model": "Redmi Note 12"
}
```

#### app:bridge_state（每 1 秒）

```json
{
  "type": "bridge_state",
  "app_online": true,
  "socket_connected": true,
  "ble_connected": false,
  "current_owner": "app",
  "current_mode": "manual",
  "current_order_id": null,
  "last_car_seen_at": 1779350000000,
  "rssi": -45
}
```

服务端收到后直接转发给 web_clients：`server:bridge_state`

#### app:telemetry（每 500ms）

```json
{
  "type": "telemetry",
  "ts": 1779350000000,
  "mode": "auto",
  "move_state": "tracing",
  "lift_state": "idle",
  "progress_pct": 45,
  "estimated_pos": { "x": 120.5, "y": 85.3 },
  "estimated_heading": 45,
  "estimated_lift_height_mm": 80,
  "battery_v": 11.8,
  "obstacle_cm": 25,
  "ir_sensors": [1, 1, 0, 1],
  "alarm": null
}
```

服务端处理：
1. 更新内存 telemetryStore
2. 转发给 web_clients：`server:telemetry`
3. 每 5 秒采样一次写入 telemetry_logs

#### app:alarm

```json
{
  "code": "ESTOP_LOCAL",
  "level": "critical",
  "msg": "操作员触发急停",
  "source": "app",
  "order_id": "WO-20260521-001",
  "ts": 1779350000000
}
```

服务端处理：
1. 入库 alarms 表
2. 转发给 web_clients：`server:alarm`

#### app:cmd_ack

```json
{
  "cmd_id": "cmd_20260521_0001",
  "stage": "app_received",
  "ok": true,
  "msg": "App 已接收工单"
}
```

服务端处理：
1. 更新 command_logs 表
2. 转发给 web_clients：`server:command_updated`
3. 取消超时计时器

#### app:order_event

```json
{
  "order_id": "WO-20260521-001",
  "event": "completed",
  "duration_s": 32,
  "result": "OK"
}
```

服务端处理：
1. 更新 orders 表状态
2. 记录 order_events 表
3. 广播 `server:order_updated`

### 3.2 服务端 → App

#### pc:auth_result

```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "role": "admin",
  "worker_name": "张三"
}
```

#### pc:command

```json
{
  "cmd_id": "cmd_20260521_0001",
  "type": "order.start",
  "priority": 50,
  "need_ack": true,
  "order_id": "WO-20260521-001",
  "payload": {
    "target_x": 100,
    "target_y": 200,
    "target_node": "A3",
    "mode": "auto_trace"
  },
  "ts": 1779350000000
}
```

#### pc:estop

```json
{
  "reason": "admin_remote",
  "ts": 1779350000000
}
```

#### pc:takeover

```json
{
  "lock": true,
  "admin_name": "管理员",
  "ts": 1779350000000
}
```

### 3.3 Web 前端 → 服务端

#### web:join

无载荷，仅加入 web_clients 房间。

#### web:start_order

```json
{
  "order_id": "WO-20260521-001"
}
```

服务端处理：
1. 校验工单状态
2. 生成 cmd_id
3. 构建 pc:command 帧
4. 入库 command_logs
5. emit 给 app 房间
6. 启动超时计时器（3 秒）

#### web:estop

```json
{
  "reason": "admin_remote"
}
```

服务端直接转发给 app 房间，不等 ACK。

## 4. 超时与重试机制

```
命令下发
  → 3 秒超时等待 app_received
    → 未收到 → 重试（最多 3 次）
      → 3 次均失败 → 标记 timeout
        → 通知 web_clients

命令 ACK 阶段:
  created → sent → acked (app_received) → started (car_started) → completed/failed/timeout
```

每次 ACK 都更新 command_logs 表和通知 Web 前端。
