# 手机 App 开发指南

## 1. 项目定位

手机 App 运行在 Android 手机上，是系统的**桥接控制中心**：

```
手机 App = 现场遥控器 + BLE 管理器 + Socket.IO 客户端 + 控制权仲裁器 + 模拟小车
```

### App 负责

1. 操作员登录
2. 连接上位机（Socket.IO）
3. 连接 BLE 小车 / 启用模拟模式
4. 手动遥控（摇杆、推杆）
5. 急停
6. 接收上位机工单，转为 BLE/模拟指令
7. 上报遥测状态给上位机
8. 上报报警给上位机
9. 控制权仲裁
10. 模拟小车（FakeCarTransport）

### App 不负责

- 工单数据库管理
- 历史统计报表
- 复杂人员管理

这些都在上位机。

## 2. 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 框架 | Uni-app (Vue3 + JavaScript) | 编译安卓 APK |
| 状态管理 | Pinia | Vue3 官方状态管理 |
| 实时通信 | Socket.IO Client | 连接上位机 |
| 蓝牙 | uni.BLE API | 连接 ESP32 |
| 构建 | HBuilderX / CLI | 云打包或本地 Android SDK |

## 3. 项目结构

```
car-controller-app/
├── pages/
│   ├── login/
│   │   └── index.vue            # 登录页
│   ├── main/
│   │   └── index.vue            # 主控制页（摇杆+推杆+急停）
│   ├── orders/
│   │   └── index.vue            # 工单列表/执行页
│   ├── alarms/
│   │   └── index.vue            # 报警日志
│   ├── settings/
│   │   └── index.vue            # 设置（服务器地址、BLE、模拟模式）
│   └── debug/
│       └── index.vue            # 调试页（隐藏）
├── components/
│   ├── ConnectionBanner.vue     # 连接状态横幅
│   ├── Joystick.vue             # 虚拟摇杆（Canvas）
│   ├── LiftControl.vue          # 推杆控制面板
│   ├── EstopButton.vue          # 急停按钮
│   ├── TelemetryPanel.vue       # 遥测数据面板
│   ├── AlarmList.vue            # 报警列表
│   └── CommandLog.vue           # 命令日志
├── services/
│   ├── socket/
│   │   └── SocketClient.js      # Socket.IO 客户端封装
│   ├── car/
│   │   ├── CarTransport.js      # 抽象接口
│   │   ├── FakeCarTransport.js  # 模拟小车实现
│   │   └── BleCarTransport.js   # 真实 BLE 实现（预留）
│   ├── ble/
│   │   ├── BleScanner.js        # BLE 扫描
│   │   ├── BleWriteQueue.js     # BLE 串行写入队列
│   │   └── BlePacketCodec.js    # BLE 分包/组包
│   ├── bridge/
│   │   ├── CommandArbiter.js    # 控制权仲裁
│   │   └── CommandMapper.js     # 上位机命令 → 小车指令映射
│   └── protocol/
│       ├── pcProtocol.js        # 上位机协议常量
│       └── carProtocol.js       # 小车协议常量
├── stores/
│   ├── userStore.js             # 用户登录状态
│   ├── connectionStore.js       # 连接状态（Socket.IO + BLE）
│   ├── carStore.js              # 小车实时状态
│   ├── orderStore.js            # 当前工单
│   └── alarmStore.js            # 报警列表
├── utils/
│   ├── id.js                    # ID 生成
│   ├── time.js                  # 时间格式化
│   └── logger.js                # 日志工具
├── static/
│   └── ...
├── manifest.json
├── pages.json
├── App.vue
├── main.js
└── uni.scss
```

## 4. 核心设计：BLE 抽象层

**这是当前最关键的设计。** 嵌入式未完成，App 必须能独立运行。

### 4.1 CarTransport 接口

```javascript
class CarTransport {
  connect()                  // 连接小车
  disconnect()               // 断开
  sendCommand(cmd)           // 发送指令
  onStatus(callback)         // 注册状态回调
  onAlarm(callback)          // 注册报警回调
  isConnected()              // 连接状态
}
```

### 4.2 两个实现

| 实现 | 用途 | 优先级 |
|------|------|--------|
| `FakeCarTransport` | 模拟小车，无需硬件 | **当前优先实现** |
| `BleCarTransport` | 真实 BLE 通信 | 嵌入式完成后对接 |

### 4.3 页面调用方式

```javascript
// 页面不关心底层是真 BLE 还是模拟器
carTransport.sendCommand({ c: "move", dx: 0.3, dy: 0.1, spd: 2 })
```

切换模式只需在设置页更改 `simulate_mode`，App 自动切换 Transport 实现。

## 5. 编译与运行

### 开发调试

```bash
# 需要安装 HBuilderX
# 或使用 CLI：
npm install -g @dcloudio/uni-cli
cd car-controller-app

# 安卓真机调试
npm run dev:app
```

### 打包 APK

```bash
# HBuilderX 云打包（推荐，无需本地 Android SDK）
# 或 CLI 打包
npm run build:app-android
```

### 开发模式（H5 预览）

```bash
# 浏览器预览（不含 BLE，但可测试 UI 和 Socket.IO）
npm run dev:h5
```

## 6. 开发约定

- Vue3 Composition API 风格
- 组件文件 PascalCase，服务文件 camelCase
- Store 使用 Pinia，命名 `xxxStore.js`
- BLE 操作必须通过 `services/car/` 或 `services/ble/` 模块，页面不直接调用 `uni.writeBLECharacteristicValue`
- Socket.IO 操作通过 `services/socket/SocketClient.js`，页面不直接操作 socket 实例
