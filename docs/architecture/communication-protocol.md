# 通信协议规范

## 1. 协议总原则

1. **统一 JSON 格式** — 全链路使用 JSON，人类可读、调试方便
2. **单入口原则** — 小车只认 BLE 来的帧，上位机指令必须经 App 翻译后下发
3. **命令必须有 ACK** — 所有重要命令带 `cmd_id`，App 分阶段回执
4. **心跳保活** — 每条链路独立心跳，断连后触发 Fail-safe
5. **急停最高优先** — 急停帧绕过队列直接处理

## 2. 上位机 ↔ App（Socket.IO）

Socket.IO 基于 WebSocket 长连接，自动重连、事件驱动。
默认投递语义为 at most once，因此关键命令需要 ACK + 超时重试。

### 2.1 事件命名规范

**App → 上位机（上行）：**

| 事件名 | 说明 | 载荷 |
|--------|------|------|
| `app:auth` | 操作员登录认证 | `{worker_id, password}` |
| `app:hello` | 连接后握手 | `{app_version}` |
| `app:bridge_state` | 桥接状态（1s 周期） | 见 2.3 |
| `app:telemetry` | 小车遥测（500ms 周期） | 见 2.4 |
| `app:alarm` | 报警事件 | 见 2.6 |
| `app:cmd_ack` | 命令回执 | 见 2.5 |
| `app:order_event` | 工单事件 | `{order_id, event, duration_s, result}` |
| `app:disconnecting` | 主动断开通知 | `{reason}` |

**上位机 → App（下行）：**

| 事件名 | 说明 | 载荷 |
|--------|------|------|
| `pc:auth_result` | 认证结果 | `{ok, token, role, worker_name}` |
| `pc:command` | 统一命令下发 | 见 2.5 |
| `pc:estop` | 远程急停 | `{reason}` |
| `pc:takeover` | 管理员接管 | `{lock: true/false}` |
| `pc:sync_request` | 请求当前状态 | `{}` |

**上位机 Web 前端 → Socket Server（内部）：**

| 事件名 | 说明 |
|--------|------|
| `web:join` | 前端加入监控房间 |
| `web:create_order` | 创建工单 |
| `web:start_order` | 启动工单 |
| `web:pause_order` | 暂停工单 |
| `web:resume_order` | 继续工单 |
| `web:cancel_order` | 取消工单 |
| `web:estop` | 远程急停 |
| `web:takeover` | 管理员接管/释放 |

**Socket Server → Web 前端（内部）：**

| 事件名 | 说明 |
|--------|------|
| `server:bridge_state` | App 桥接状态转发 |
| `server:telemetry` | 小车遥测转发 |
| `server:alarm` | 报警转发 |
| `server:order_updated` | 工单状态变化 |
| `server:command_updated` | 命令回执变化 |

### 2.2 房间管理

```
Socket.IO Rooms:
├── "app"           App 客户端（已认证）
├── "web_clients"   Web 前端浏览器
└── 默认            未认证连接
```

### 2.3 桥接状态帧 (bridge_state)

App 每 1 秒上报：

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

### 2.4 遥测状态帧 (telemetry)

App 每 500ms 上报：

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

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| mode | string | `idle` / `manual` / `auto` / `estop` / `fault` |
| move_state | string | `idle` / `moving` / `tracing` / `stopped` |
| lift_state | string | `idle` / `up` / `down` / `stopped` |
| progress_pct | number | 工单执行进度 0-100 |
| estimated_pos | object | 估计位置（真实设备上报） |
| estimated_heading | number | 估计朝向角度 0-360 |
| estimated_lift_height_mm | number | 估计推杆高度 mm |
| battery_v | number | 电池电压 V |
| obstacle_cm | number | 最近障碍距离 cm |
| ir_sensors | number[] | 红外传感器阵列 |

### 2.5 统一命令格式与 ACK

**上位机下发命令：**

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

命令 type 枚举：

| type | 说明 | priority |
|------|------|----------|
| `order.start` | 启动工单 | 50 |
| `order.pause` | 暂停工单 | 60 |
| `order.resume` | 继续工单 | 50 |
| `order.cancel` | 取消工单 | 70 |
| `control.estop` | 远程急停 | 100 |
| `control.takeover` | 管理员接管 | 90 |
| `control.release` | 释放接管 | 50 |
| `system.sync` | 状态同步 | 10 |

**App 回执（分阶段 ACK）：**

阶段 1 — App 已接收：

```json
{
  "cmd_id": "cmd_20260521_0001",
  "stage": "app_received",
  "ok": true,
  "msg": "App 已接收工单"
}
```

阶段 2 — 小车已开始执行：

```json
{
  "cmd_id": "cmd_20260521_0001",
  "stage": "car_started",
  "ok": true,
  "msg": "小车已开始循迹"
}
```

阶段 3 — 执行完成：

```json
{
  "cmd_id": "cmd_20260521_0001",
  "stage": "completed",
  "ok": true,
  "msg": "工单执行完成"
}
```

**超时与重试：**

- App 收到命令后 2 秒内必须回 `app_received`
- 上位机 3 秒未收到 ACK 则重试，最多 3 次
- 3 次均失败则标记命令为 `timeout`，通知 Web 前端

### 2.6 报警帧

```json
{
  "code": "OBSTACLE",
  "level": "warning",
  "msg": "前方障碍物距离 8cm",
  "source": "car",
  "order_id": "WO-20260521-001",
  "ts": 1779350000000
}
```

报警 code 枚举：

| code | level | 说明 |
|------|-------|------|
| `ESTOP_LOCAL` | critical | App 本地急停 |
| `ESTOP_REMOTE` | critical | 上位机远程急停 |
| `BLE_LOST` | critical | 蓝牙断开 |
| `PC_LOST` | warning | 上位机连接断开 |
| `OBSTACLE` | warning | 障碍物过近 |
| `LOW_BATTERY` | warning | 电池低压 |
| `LIMIT_HIT` | critical | 限位触发 |
| `COMMAND_TIMEOUT` | warning | 命令超时 |
| `APP_OFFLINE` | critical | App 离线 |

## 3. App ↔ ESP32（BLE GATT）

### 3.1 GATT 服务定义

```
Service UUID: 0000FFE0-0000-1000-8000-00805F9B34FB

├── CMD (FFE1) — Write
│   App → ESP32: 写入控制 JSON
│
├── STS (FFE2) — Notify
│   ESP32 → App: 通知推送状态 JSON
│
└── LOG (FFE3) — Notify
    ESP32 → App: 报警/异常事件
```

### 3.2 BLE 控制指令帧（App → ESP32）

使用紧凑 JSON，减少 BLE 传输量：

```json
{"c":"move","dx":0.5,"dy":0.3,"spd":2}
{"c":"lift","dir":"up"}
{"c":"lift","dir":"down"}
{"c":"lift","dir":"stop"}
{"c":"trace","target":{"x":100,"y":200}}
{"c":"estop"}
{"c":"stop"}
{"c":"ping"}
{"c":"reset"}
```

### 3.3 BLE 状态上报帧（ESP32 → App）

```json
{"s":"ok","x":120.5,"y":85.3,"h":80,"mv":"tracing","bv":11.8,"ob":25,"ir":[1,1,0,1]}
```

缩写映射：

| 缩写 | 全称 | 说明 |
|------|------|------|
| s | status | ok / fault / estop |
| x, y | position | 位置坐标 |
| h | height | 推杆高度 mm |
| mv | move_state | idle/moving/tracing/stopped |
| bv | battery_voltage | 电池电压 V |
| ob | obstacle | 障碍距离 cm |
| ir | ir_sensors | 红外传感器阵列 |

### 3.4 分包协议

当 JSON 超过 MTU（建议每次写入不超过 200 字节）时分包：

```
包头 (1B): 0xAA
序号 (1B): 当前包序号 (0-based)
总包数 (1B): 本次传输总包数
数据 (N B): JSON 片段 UTF-8
```

App 端收到所有包后拼接还原完整 JSON。

### 3.5 BLE 写入队列

uni-app BLE 写入必须串行化：

```
写入队列 → 发送第 1 包 → 等 success/fail → 发送第 2 包 → ...
```

并行写入会导致失败。App 的 `BleWriteQueue` 负责保证串行写入顺序。
