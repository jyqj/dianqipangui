# BLE 协议设计

## 1. 概述

App 作为 BLE Central，ESP32 作为 Peripheral。通信基于 GATT 协议。

App 不生成本地造数；BLE 层直接连接真实 ESP32 小车，所有状态与报警来自 notify。

## 2. GATT 服务定义

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

## 3. 模块结构

```
services/ble/
├── BleScanner.js         # 扫描 BLE 设备
├── BleWriteQueue.js      # 串行写入队列
└── BlePacketCodec.js     # 分包/组包编解码

services/car/
├── CarTransport.js       # 抽象接口
├── BleCarTransport.js    # 真实 BLE 实现
```

## 4. BleScanner

扫描附近蓝牙设备，筛选名称前缀为 `ESP32` 的设备。

```javascript
class BleScanner {
  async init()                    // 初始化蓝牙适配器
  async startScan(timeout = 5000) // 开始扫描
  async stopScan()                // 停止扫描
  getDevices()                    // 获取已发现设备列表
  onDeviceFound(callback)         // 发现设备回调
}
```

返回设备列表格式：
```json
[
  { "id": "AA:BB:CC:DD:EE:FF", "name": "ESP32_CAR", "rssi": -45 }
]
```

## 5. BleWriteQueue

uni-app BLE 写入必须串行化。并行写入会导致失败。

```javascript
class BleWriteQueue {
  constructor(deviceId, serviceId, characteristicId)
  enqueue(buffer)               // 加入写入队列
  flush()                       // 开始处理队列
  clear()                       // 清空队列
  get pending()                 // 待处理数量
}
```

处理流程：

```
enqueue(buffer1) → enqueue(buffer2) → enqueue(buffer3)
  ↓
flush():
  writeBLE(buffer1) → 等 success → writeBLE(buffer2) → 等 success → writeBLE(buffer3)
```

每次写入不超过 200 字节（协商后 MTU）。

## 6. BlePacketCodec

超过 MTU 时的分包/组包处理。

### 6.1 分包格式

```
包头 (1B): 0xAA
序号 (1B): 当前包序号 (0-based)
总包数 (1B): 本次传输总包数
数据 (N B): JSON 片段 UTF-8
```

### 6.2 编码（App → ESP32）

```javascript
BlePacketCodec.encode(jsonString, mtu = 200)
// 返回: ArrayBuffer[]（一个或多个分包）
```

### 6.3 解码（ESP32 → App）

```javascript
const decoder = new BlePacketCodec.Decoder()
decoder.feed(packet)           // 喂入一个分包
if (decoder.isComplete()) {
  const json = decoder.getResult()  // 获取完整 JSON
}
```

## 7. BleCarTransport

真实 BLE 传输层实现（嵌入式完成后对接）。

```javascript
class BleCarTransport extends CarTransport {
  constructor() {
    this.scanner = new BleScanner()
    this.writeQueue = null
    this.decoder = new BlePacketCodec.Decoder()
  }

  async connect(deviceId) {
    // 1. createBLEConnection
    // 2. 获取 services 和 characteristics
    // 3. 初始化 BleWriteQueue
    // 4. 启用 STS notify
    // 5. 启用 LOG notify
    // 6. 启动心跳
  }

  sendCommand(cmd) {
    const json = JSON.stringify(cmd)
    const packets = BlePacketCodec.encode(json, 200)
    packets.forEach(p => this.writeQueue.enqueue(p))
    this.writeQueue.flush()
  }

  disconnect() {
    // 清理心跳、关闭连接
  }
}
```

## 8. 连接流程

```
用户点击"连接蓝牙"
  → BleScanner.startScan()
    → 显示设备列表
      → 用户选择设备
        → BleCarTransport.connect(deviceId)
          → createBLEConnection
            → getServices
              → enableNotify(STS)
                → enableNotify(LOG)
                  → 开始心跳 ping (1s)
                    → 连接成功，更新 connectionStore
```

## 9. 断连处理

```
BLE 连接断开
  → 停止心跳
  → 清空写入队列
  → 上报 BLE_LOST 报警
  → 更新 connectionStore
  → 通知上位机
  → 如果设置了自动重连：5 秒后尝试重连
```
