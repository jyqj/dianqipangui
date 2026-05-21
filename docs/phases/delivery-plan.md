# 分阶段交付计划

## 概述

按"vibe coding 最容易推进"的顺序排列。每个 Phase 独立可验收，不强制排期。

**最关键的是 Phase 3：模拟小车闭环。** 它能保证即使嵌入式暂时没完成，软件部分也可以完整展示。

---

## Phase 1：上位机基础闭环

### 目标

上位机跑起来，有页面、有数据库、有 Socket.IO。

### 交付物

- Next.js 项目初始化
- 自定义 Node Server (`server.ts`)
- SQLite 初始化 + 建表
- workers 表 + 默认管理员
- orders 表
- Socket.IO Server 基础连接
- Dashboard 页面（静态）
- 工单列表页面（CRUD）
- 侧边栏 + 全局布局

### 验收标准

- [ ] 浏览器能打开 `http://localhost:3000`
- [ ] 能创建、编辑、删除工单
- [ ] 能看到工单列表
- [ ] Socket.IO server 能接受连接（Console 打印连接日志）

---

## Phase 2：App 基础闭环

### 目标

App 能登录、能连上位机、能显示主控页面。

### 交付物

- Uni-app 工程初始化
- 登录页
- 主控制页（布局框架）
- 设置页
- SocketClient 封装
- connectionStore
- userStore

### 验收标准

- [ ] App 能配置上位机 IP
- [ ] App 能连接上位机 Socket.IO
- [ ] 上位机 Console 显示 App 已连接
- [ ] App 登录 → 上位机认证通过
- [ ] App 显示 "PC: 在线"

---

## Phase 3：模拟小车闭环（最关键）

### 目标

无 ESP32 的情况下，跑通"上位机 → App → 模拟小车 → 上位机"完整闭环。

### 交付物

- CarTransport 抽象接口
- FakeCarTransport 模拟实现
- 模拟遥测数据生成
- 模拟 trace 执行（progress 0→100）
- 模拟 move / lift / stop / estop
- carStore 状态管理
- App telemetry 上报 (app:telemetry)
- App bridge_state 上报 (app:bridge_state)
- 上位机 monitor 页面（Canvas 地图 + 状态面板）
- 上位机 telemetryStore（内存）

### 验收标准

- [ ] 上位机创建并启动工单
- [ ] App 收到工单
- [ ] 模拟小车 progress 从 0 到 100
- [ ] 上位机监控页看到小车位置变化
- [ ] 上位机监控页看到实时状态更新
- [ ] 工单自动变 completed
- [ ] 工单详情页有完整时间线

---

## Phase 4：命令 ACK 与日志闭环

### 目标

系统从"能发消息"变成"能确认消息"。

### 交付物

- cmd_id 生成逻辑
- commandService（上位机端）
- app_received ACK
- car_started ACK
- command_logs 表写入
- 命令状态面板（上位机监控页）
- 命令超时提示
- 重试逻辑（最多 3 次）

### 验收标准

- [ ] 每个上位机命令都能看到完整状态链：
  - 已创建 → 已发送 → App 已接收 → 模拟小车已执行 → 完成/失败
- [ ] 超时命令显示 timeout
- [ ] command_logs 表有完整记录

---

## Phase 5：App 手动控制完善

### 目标

手机 App 做成真正能演示的遥控器。

### 交付物

- Joystick 虚拟摇杆组件（Canvas）
- 速度 3 档切换
- LiftControl 推杆上升/下降/停止
- EstopButton 急停按钮
- AlarmList 报警列表组件
- TelemetryPanel 状态卡片
- ConnectionBanner 连接状态横幅
- CommandArbiter 控制权仲裁

### 验收标准

- [ ] App 操作摇杆 → 上位机监控页看到位置变化
- [ ] App 控制推杆 → 上位机看到高度变化
- [ ] App 急停 → 上位机立即显示 ESTOP 报警
- [ ] 被管理员接管时，摇杆禁用
- [ ] 速度切换生效

---

## Phase 6：真实 BLE 预留接入

### 目标

BLE 接口写好，等嵌入式完成后可直接对接。

### 交付物

- BleScanner 扫描模块
- BleCarTransport 实现
- BleWriteQueue 串行写入队列
- BlePacketCodec 分包/组包
- BLE 连接页面
- BLE 原始日志
- 设置页 BLE UUID 配置

### 验收标准

- [ ] 能扫描 BLE 设备
- [ ] 能连接设备
- [ ] 能启用 notify
- [ ] 能写入简单 ping 命令
- [ ] 模拟模式和真实模式可切换
- [ ] 切换后所有功能正常

---

## Phase 7：安全与演示打磨

### 目标

系统看起来完整、稳定、能答辩。

### 交付物

- 远程急停完整流程
- 管理员接管/释放
- App 控制锁定 UI
- 报警日志页（上位机）
- 历史统计页 + Recharts 图表
- CSV 导出
- Debug 调试页（App）
- 演示数据预置脚本
- 人员管理页完善

### 验收标准

- [ ] 上位机远程急停 → App 立即锁定
- [ ] App 本地急停 → 上位机收到报警
- [ ] 管理员接管后 → App 摇杆不可用
- [ ] 历史页面能看到工单和报警统计
- [ ] CSV 导出正常
- [ ] 调试页显示完整日志

---

## 最终交付清单

| 序号 | 交付物 | 对应 Phase |
|------|--------|-----------|
| 1 | 上位机 Web 管理系统 | Phase 1, 4, 7 |
| 2 | 手机 App 控制系统 | Phase 2, 5, 7 |
| 3 | Socket.IO 通信协议实现 | Phase 2, 3, 4 |
| 4 | App 内置模拟小车 | Phase 3 |
| 5 | BLE 对接预留接口 | Phase 6 |
| 6 | 工单闭环演示 | Phase 3, 4 |
| 7 | 监控大屏演示 | Phase 3 |
| 8 | 急停与报警演示 | Phase 5, 7 |
| 9 | 历史数据统计 | Phase 7 |
| 10 | 开发文档 | 持续维护 |
