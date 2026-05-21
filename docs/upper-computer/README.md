# 上位机开发指南

## 1. 项目定位

上位机运行在本地电脑/工控机上，提供 Web 管理界面。浏览器打开 WebUI 进行操作。Node Server 同时提供页面渲染与 Socket.IO 实时通信；REST API 文档作为预留接口，当前业务 CRUD 已统一走 Socket.IO。

**上位机只负责管理侧，不直接控制底层硬件。**

### 上位机负责

1. 人员管理（CRUD、角色分配）
2. 工单管理（创建、派发、状态跟踪）
3. 实时监控大屏（小车位置、状态、轨迹）
4. 远程急停
5. 管理员接管
6. 历史记录与统计
7. 报警日志
8. 系统设置
9. App 在线状态监控
10. 模拟模式联调

### 上位机不负责

- 手动前后左右移动（在 App 上）
- 推杆上下（在 App 上）
- BLE 直连小车

上位机只发高级命令：启动工单、暂停、继续、取消、远程急停、管理员接管/释放。

## 2. 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 14.x |
| UI | React 18 + Tailwind CSS | - |
| 图标 | Lucide React | - |
| 图表 | Recharts | - |
| 实时通信 | Socket.IO Server + Client | 4.x |
| 数据库 | SQLite (better-sqlite3) | - |
| 认证 | JWT (jsonwebtoken) + bcrypt | - |
| HTTP Server | 自定义 Node Server | - |

### 为什么用自定义 Node Server

Socket.IO 长连接不适合按 serverless API route 方式处理。自定义 server 将 Next.js handler 和 Socket.IO 挂在同一个 HTTP Server 上。此方式不能部署到 Vercel，但本项目本就是局域网本地部署。

## 3. 项目结构

```
upper-computer/
├── server.ts                    # 入口：启动 Next.js + Socket.IO
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── data/
│   └── app.db                   # SQLite 数据库文件（运行时自动创建）
├── src/
│   ├── app/
│   │   ├── layout.tsx           # 全局布局（侧边栏 + 顶栏）
│   │   ├── page.tsx             # Dashboard 首页
│   │   ├── globals.css
│   │   ├── orders/
│   │   │   ├── page.tsx         # 工单列表
│   │   │   └── [id]/page.tsx    # 工单详情
│   │   ├── monitor/
│   │   │   └── page.tsx         # 实时监控大屏
│   │   ├── workers/
│   │   │   └── page.tsx         # 人员管理
│   │   ├── alarms/
│   │   │   └── page.tsx         # 报警日志
│   │   ├── history/
│   │   │   └── page.tsx         # 历史统计
│   │   └── settings/
│   │       └── page.tsx         # 系统设置
│   ├── components/
│   │   ├── Sidebar.tsx          # 侧边导航栏
│   │   ├── TopBar.tsx           # 顶部状态栏
│   │   ├── StatusCards.tsx      # 状态卡片组
│   │   ├── MonitorCanvas.tsx    # 实时地图画布
│   │   ├── OrderTable.tsx       # 工单表格
│   │   ├── OrderForm.tsx        # 工单表单
│   │   ├── AlarmBanner.tsx      # 报警横幅
│   │   └── CommandPanel.tsx     # 命令回执面板
│   ├── server/
│   │   ├── socket.ts            # Socket.IO 服务端逻辑
│   │   ├── db.ts                # SQLite 连接与初始化
│   │   ├── auth.ts              # JWT 认证
│   │   ├── commandService.ts    # 命令下发、ACK、超时、重试
│   │   ├── orderService.ts      # 工单业务逻辑
│   │   └── telemetryStore.ts    # 当前小车状态（内存）
│   ├── shared/
│   │   ├── protocol.ts          # 上位机和 App 共用协议类型定义
│   │   ├── enums.ts             # 枚举常量
│   │   └── validators.ts        # 数据校验
│   └── lib/
│       └── socketClient.ts      # 前端 Socket.IO 客户端 hook
```

## 4. 启动方式

```bash
# 安装依赖
cd upper-computer
npm install

# 开发模式（自动热重载）
npm run dev
# → http://localhost:3000

# 生产构建
npm run build
npm start
```

## 5. 核心模块说明

### 5.1 server.ts

自定义入口，创建 HTTP Server，同时挂载 Next.js 和 Socket.IO：

```
createServer(nextHandler)
  → attachSocketIO(httpServer)
  → httpServer.listen(3000)
```

### 5.2 commandService.ts

负责命令的完整生命周期：

```
生成 cmd_id → 入库 command_logs → emit pc:command
  → 等待 app_received ACK (2s 超时)
  → 等待 car_started ACK
  → 等待 completed/failed
  → 超时 3 次 → 标记 timeout
```

### 5.3 telemetryStore.ts

内存中保存当前最新的小车状态，不需要每帧入库：

- 实时状态放内存，前端 Socket.IO 直接读取
- 每 5 秒采样一次写入 `telemetry_logs` 表（供历史回放）

### 5.4 db.ts

使用 better-sqlite3 同步 API，首次运行自动建表。详见 [数据库设计](database-schema.md)。

## 6. 开发约定

- TypeScript strict 模式
- 组件文件 PascalCase，工具文件 camelCase
- Socket.IO 事件名用 `namespace:action` 格式
- 数据库操作集中在 `server/` 目录下的 service 模块中
- 前端只通过 Socket.IO 获取数据，不直接访问数据库；如后续补 REST API，需与 Socket.IO 共用同一鉴权与 service 层
