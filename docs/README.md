# 电气盘柜吊装转运系统 — 软件开发文档

## 项目概述

电气盘柜吊装转运小车的软件控制系统，采用**三层桥接架构**：

```
上位机 WebUI (Next.js)
       │ Socket.IO / WiFi / 局域网
       ▼
手机 App (Uni-app Android)
       │ BLE GATT
       ▼
ESP32 小车 (暂未完成，软件侧用模拟器替代)
```

**核心原则：上位机不直连小车，App 作为唯一通信桥梁。**

## 文档索引

### 架构设计

| 文档 | 说明 |
|------|------|
| [系统架构总览](architecture/system-overview.md) | 三层架构、技术栈、数据流 |
| [通信协议规范](architecture/communication-protocol.md) | Socket.IO 事件、BLE GATT、JSON 帧格式 |
| [安全机制设计](architecture/security.md) | 多层急停、断连保护、认证权限、控制权仲裁 |

### 上位机 (upper-computer)

| 文档 | 说明 |
|------|------|
| [上位机开发指南](upper-computer/README.md) | 项目结构、启动方式、开发约定 |
| [数据库设计](upper-computer/database-schema.md) | SQLite 表结构、字段说明、写入策略 |
| [Socket.IO 事件](upper-computer/socket-events.md) | 服务端事件定义、房间管理、ACK 机制 |
| [页面功能说明](upper-computer/pages.md) | 各页面功能、布局、交互逻辑 |
| [API 接口文档](upper-computer/api-reference.md) | REST API 端点定义 |

### 手机 App (car-controller-app)

| 文档 | 说明 |
|------|------|
| [App 开发指南](app/README.md) | 项目结构、编译方式、开发约定 |
| [BLE 协议设计](app/ble-protocol.md) | GATT 服务、指令帧、分包机制、写队列 |
| [模拟小车设计](app/fake-car.md) | FakeCarTransport 行为、模拟状态生成 |
| [界面布局](app/ui-layout.md) | 各页面布局、组件说明 |
| [状态管理](app/stores.md) | Pinia Store 定义、数据流 |

### 工程管理

| 文档 | 说明 |
|------|------|
| [部署指南](deployment/guide.md) | 上位机部署、App 编译、网络拓扑 |
| [分阶段交付计划](phases/delivery-plan.md) | 7 个 Phase 的交付目标和验收标准 |

## 技术栈总览

| 层级 | 技术 | 理由 |
|------|------|------|
| 上位机前端 | Next.js 14 + React 18 + Tailwind CSS | 页面+API 一体化，Tailwind 快速出 UI |
| 上位机后端 | 自定义 Node Server + Socket.IO | 长连接不适合 serverless API route |
| 数据库 | SQLite (better-sqlite3) | 单机轻量零运维，适合工地/实验环境 |
| 手机 App | Uni-app (Vue3 + JavaScript) | 编译安卓 APK，蓝牙 API 统一 |
| 通信协议 | JSON over Socket.IO / BLE GATT | 人类可读、调试方便 |

## 答辩口径

> 本系统的软件部分采用上位机与手机 App 分层设计。上位机负责工单管理、过程监控、历史数据和权限管理；手机 App 作为现场遥控终端，同时承担上位机与执行机构之间的通信桥梁。控制指令统一从 App 这一入口进入小车端，消除多源指令冲突。当前嵌入式模块尚未完全完成，App 内置了模拟小车模块，用于提前验证工单流转、状态监控和急停报警等功能。待嵌入式完成后，只需将模拟传输层替换为真实 BLE 传输层，即可完成整机联调。
