# 部署指南

## 1. 环境要求

### 上位机

| 组件 | 要求 |
|------|------|
| 操作系统 | Windows 10+ / macOS / Linux |
| Node.js | 18.x 或更高 |
| npm | 9.x 或更高 |
| 浏览器 | Chrome 90+ / Edge 90+ / Firefox 90+ |
| 网络 | 工地局域网 WiFi |

### 手机 App

| 组件 | 要求 |
|------|------|
| 系统 | Android 8.0+ |
| 蓝牙 | BLE 5.0+ |
| 权限 | 蓝牙、位置（BLE 扫描需要） |
| 网络 | 与上位机同一局域网 WiFi |

### 开发环境

| 工具 | 用途 |
|------|------|
| HBuilderX | Uni-app 开发和打包 |
| VS Code | 上位机开发 |
| Android Studio | （可选）本地 APK 打包 |

## 2. 上位机部署

### 2.1 开发模式

```bash
cd upper-computer
npm install
npm run dev
```

访问 `http://localhost:3000`

### 2.2 生产部署

```bash
cd upper-computer
npm install
npm run build
npm start
```

服务启动后：
- Web UI：`http://<本机IP>:3000`
- Socket.IO：同端口自动启动
- SQLite 数据库：`data/app.db` 自动创建

### 2.3 配置

环境变量（`.env.local`）：

```env
PORT=3000
JWT_SECRET=your-secret-key-change-this
ADMIN_PASSWORD=admin123
```

### 2.4 数据备份

SQLite 数据库在 `data/app.db`，直接复制文件即可备份。

## 3. 手机 App 编译

### 3.1 HBuilderX 云打包（推荐）

1. 用 HBuilderX 打开 `car-controller-app/` 项目
2. 菜单 → 发行 → 原生App-云打包
3. 选择 Android
4. 等待打包完成，下载 APK

### 3.2 CLI 打包

```bash
cd car-controller-app
npm install
npm run build:app-android
```

### 3.3 安装 APK

将 APK 传到手机安装，首次需要允许"安装未知来源应用"。

### 3.4 H5 预览（无需手机）

```bash
cd car-controller-app
npm run dev:h5
```

浏览器打开 `http://localhost:5173`，可测试 UI 和 Socket.IO，但无 BLE 功能。

## 4. 网络拓扑

### 4.1 推荐拓扑

```
[专用 WiFi 路由器]
       │
       ├── 上位机电脑 (固定 IP: 192.168.1.100)
       │     └── Next.js + Socket.IO (port 3000)
       │
       ├── 手机 (DHCP: 192.168.1.x)
       │     ├── Socket.IO → 192.168.1.100:3000
       │     └── BLE → ESP32 小车
       │
       └── （可选）其他电脑浏览器
             └── 访问 http://192.168.1.100:3000
```

### 4.2 网络配置

1. 路由器建议使用 5GHz WiFi，降低延迟
2. 上位机电脑建议固定 IP：`192.168.1.100`
3. 手机 App 设置页填入上位机 IP

### 4.3 防火墙

上位机需要放行端口 3000（TCP）。

Windows：
```
netsh advfirewall firewall add rule name="上位机" dir=in action=allow protocol=TCP localport=3000
```

macOS：默认不阻挡。

## 5. 首次启动检查清单

### 上位机

- [ ] Node.js 已安装
- [ ] `npm install` 无报错
- [ ] `npm run dev` 启动成功
- [ ] 浏览器能打开 `http://localhost:3000`
- [ ] 默认管理员 admin/admin123 能登录
- [ ] Socket.IO 连接正常（Console 无报错）

### 手机 App

- [ ] APK 安装成功
- [ ] 蓝牙权限已授予
- [ ] 位置权限已授予
- [ ] 设置页填入正确的上位机 IP
- [ ] 模拟模式已开启
- [ ] 能连接上位机（状态栏显示"PC: 在线"）
- [ ] 登录成功

### 联调验证

- [ ] 上位机能看到 App 在线
- [ ] 上位机创建工单 → App 能收到
- [ ] App 摇杆操作 → 上位机监控页能看到状态变化
- [ ] App 急停 → 上位机收到报警
- [ ] 上位机远程急停 → App 显示急停锁定

## 6. 常见问题

### App 连不上上位机

1. 确认手机和电脑在同一 WiFi
2. 确认上位机 IP 正确（电脑终端执行 `ipconfig` / `ifconfig`）
3. 确认端口 3000 未被防火墙阻挡
4. 确认上位机服务已启动

### BLE 扫描不到设备

1. 确认手机蓝牙已开启
2. 确认位置权限已授予（Android 要求）
3. 确认 ESP32 已上电并在广播
4. 确认设备名前缀设置正确

### Socket.IO 频繁断连

1. 检查 WiFi 信号质量
2. 确认没有多个 App 实例同时连接
3. 查看上位机 Console 日志
