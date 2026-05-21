# 系统架构总览

## 1. 三层桥接架构

```
┌────────────────┐  Socket.IO (TCP/IP)  ┌────────────────┐  BLE 5.0 GATT  ┌────────────────┐
│   上位机 WebUI  │ ◄──────────────────► │   手机 App      │ ◄────────────► │   ESP32 小车    │
│   (Next.js)    │      局域网 WiFi      │   (Android)     │     蓝牙       │   (FreeRTOS)   │
└────────────────┘                      └────────────────┘                └────────────────┘
     管理层                                  桥接层                           执行层
```

### 各层职责

| 层级 | 职责 | 不负责 |
|------|------|--------|
| **管理层（上位机）** | 工单管理、实时监控大屏、历史统计、人员管理、远程急停、管理员接管 | 手动前后左右、推杆上下等底层操控 |
| **桥接层（手机 App）** | 现场遥控、BLE 管理、Socket.IO 客户端、控制权仲裁、模拟小车 | 工单数据库、历史报表、复杂人员管理 |
| **执行层（ESP32）** | 电机驱动、传感器采集、循迹执行、硬件急停 | 暂未完成，软件侧用 FakeCar 模拟器替代 |

### 单入口原则

小车只接受来自 BLE 的指令帧。上位机的任何控制命令（启动工单、远程急停、管理员接管）都必须经 App 翻译后通过 BLE 下发。这从根本上消除多源指令冲突。

## 2. 数据流

### 2.1 工单执行流

```
上位机创建工单
  → Socket.IO emit pc:command (type: order.start)
    → App 收到，回 ACK (stage: app_received)
      → App 转为 BLE 指令 / FakeCar 指令
        → 小车/模拟器开始执行
          → App 回 ACK (stage: car_started)
            → App 周期上报 telemetry (progress 0→100%)
              → 上位机监控页实时刷新
                → 执行完成
                  → App emit app:order_event (completed)
                    → 上位机更新工单状态、入库
```

### 2.2 手动控制流

```
App 摇杆操作
  → CommandArbiter 检查控制权
    → 允许：转为 BLE 指令 / FakeCar 指令
      → 小车/模拟器执行
        → 状态回传 → App Store → Socket.IO → 上位机监控页
    → 拒绝（被接管/急停）：App 提示操作被锁定
```

### 2.3 急停流

```
任意端触发急停
  → L1 硬件限位 ISR（< 1ms）
  → L2 嵌入式超声波刹车（< 50ms）
  → L3 App 急停按钮 → BLE estop（< 100ms）
  → L4 上位机远程急停 → Socket.IO → App → BLE（< 500ms）
```

急停绕过所有队列，最高优先级。

## 3. 当前阶段策略

嵌入式未完成，软件侧优先跑通完整闭环：

```
上位机 UI + 数据库 + Socket.IO 服务端
App UI + Socket.IO 客户端 + BLE 抽象层
App 内置 FakeCarTransport 模拟小车
上位机 ↔ App 完整联调闭环
```

等嵌入式完成后，只需将 `FakeCarTransport` 替换为 `BleCarTransport`，上位机逻辑无需改动。

## 4. 网络拓扑

```
[工地局域网 WiFi 路由器]
       │
       ├── 上位机电脑 (192.168.1.100:3000)
       │     └── Next.js + Socket.IO Server + SQLite
       │
       ├── 浏览器（同一台或其他电脑）
       │     └── 访问 http://192.168.1.100:3000
       │
       └── Android 手机 (192.168.1.x)
             ├── Socket.IO Client → 连上位机
             └── BLE Central → 连 ESP32（或 FakeCar 模拟）
```

建议使用专用 WiFi 路由器组建工地局域网，确保低延迟。
