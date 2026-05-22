# 状态管理 (Pinia Stores)

## 1. 概述

App 使用 Pinia 管理全局状态。所有 Store 在 `stores/` 目录下。

## 2. userStore — 用户登录状态

```javascript
{
  state: {
    workerId: null,        // 工号
    workerName: null,      // 姓名
    role: null,            // operator / admin
    token: null,           // JWT token
    isLoggedIn: false,     // 是否已登录
  },

  actions: {
    login(workerId, password)   // 通过 SocketClient 认证
    logout()                     // 清除状态，断开连接
    setAuthResult(result)        // 设置认证结果
  }
}
```

## 3. connectionStore — 连接状态

```javascript
{
  state: {
    // Socket.IO 状态
    socketConnected: false,
    socketId: null,
    pcOnline: false,              // 上位机是否在线

    // BLE 状态
    bleConnected: false,
    bleDeviceId: null,
    bleDeviceName: null,
    bleRssi: -100,

    // 综合状态
    lastError: null,
  },

  getters: {
    carConnected()                // bleConnected
    statusText()                  // "在线/离线" 等
  },

  actions: {
    setSocketState(connected, id)
    setBleState(connected, deviceId, name)
    setSimulateMode(enabled)
    setRssi(rssi)
  }
}
```

## 4. carStore — 小车实时状态

```javascript
{
  state: {
    mode: 'idle',                  // idle/manual/auto/estop/fault
    moveState: 'idle',             // idle/moving/tracing/stopped
    liftState: 'idle',             // idle/up/down/stopped
    progressPct: 0,                // 工单进度 0-100
    estimatedPos: { x: 0, y: 0 }, // 估计位置
    estimatedHeading: 0,           // 估计朝向
    estimatedLiftHeightMm: 0,     // 估计推杆高度
    batteryV: 12.0,                // 电池电压
    obstacleCm: 50,                // 障碍距离
    irSensors: [0, 0, 0, 0],      // 红外传感器
    lastUpdateTs: 0,               // 最后更新时间
  },

  getters: {
    isEstop()                      // mode === 'estop'
    isFault()                      // mode === 'fault'
    isAuto()                       // mode === 'auto'
    batteryPct()                   // 电压转百分比
    batteryLevel()                 // high/medium/low/critical
  },

  actions: {
    updateFromTelemetry(frame)     // 从遥测帧更新
    reset()                        // 重置为初始状态
  }
}
```

## 5. orderStore — 当前工单

```javascript
{
  state: {
    currentOrder: null,            // 当前执行的工单
    // {
    //   orderId: 'WO-20260521-001',
    //   title: '1号盘柜',
    //   targetX: 100,
    //   targetY: 200,
    //   targetNode: 'A3',
    //   status: 'running',
    //   startedAt: 1779350000000,
    //   progressPct: 45,
    // }

    recentOrders: [],              // 最近完成的工单
    pendingCmds: [],               // 待确认的命令
  },

  getters: {
    hasActiveOrder()               // currentOrder !== null && status === 'running'
    currentCmdId()                 // 最新的 cmd_id
  },

  actions: {
    setCurrentOrder(order)         // 收到上位机工单
    updateProgress(pct)            // 更新进度
    completeOrder(result)          // 完成工单
    cancelOrder()                  // 取消工单
    addCmdAck(ack)                 // 记录命令回执
  }
}
```

## 6. alarmStore — 报警列表

```javascript
{
  state: {
    alarms: [],                    // 报警列表（最近 100 条）
    // [{
    //   code: 'OBSTACLE',
    //   level: 'warning',
    //   msg: '前方障碍物 8cm',
    //   source: 'car',
    //   ts: 1779350000000,
    // }]

    hasUnread: false,              // 是否有未读报警
    unreadCount: 0,
  },

  getters: {
    criticalAlarms()               // level === 'critical' 的报警
    latestAlarm()                  // 最新一条
  },

  actions: {
    addAlarm(alarm)                // 添加报警
    markAllRead()                  // 全部已读
    clear()                        // 清空
  }
}
```

## 7. 数据流示意

```
CarTransport (Fake/BLE)
  → onStatus(frame)
    → carStore.updateFromTelemetry(frame)
    → SocketClient.emit('app:telemetry', frame)
      → 上位机收到

SocketClient
  → on('pc:command')
    → orderStore.setCurrentOrder(order)
    → CommandArbiter.evaluate(cmd)
      → CarTransport.sendCommand(bleCmd)

CarTransport
  → onAlarm(alarm)
    → alarmStore.addAlarm(alarm)
    → SocketClient.emit('app:alarm', alarm)
      → 上位机收到
```
