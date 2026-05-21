# API 接口文档

> 当前实现说明：本仓库当前业务 CRUD 与实时控制已统一走 Socket.IO 事件；下列 REST API 是预留/规划文档，尚未实现为 Next.js route。若补齐 REST API，必须复用 Socket.IO 当前的管理员鉴权与 service 层，避免出现第二套权限逻辑。


## 1. 概述

上位机提供 REST API 用于数据 CRUD 操作。实时通信通过 Socket.IO 处理（见 [Socket.IO 事件](socket-events.md)）。

基础路径：`http://<host>:3000/api`

认证方式：JWT Bearer Token（通过 Socket.IO 的 app:auth 获取，或通过 POST /api/auth/login 获取）

## 2. 认证接口

### POST /api/auth/login

Web 端登录。

请求体：
```json
{
  "worker_no": "admin",
  "password": "admin123"
}
```

响应：
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "worker": {
    "id": 1,
    "worker_no": "admin",
    "name": "管理员",
    "role": "admin"
  }
}
```

## 3. 工单接口

### GET /api/orders

获取工单列表。

查询参数：
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按状态筛选 |
| page | number | 页码，默认 1 |
| limit | number | 每页数量，默认 20 |

响应：
```json
{
  "orders": [...],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

### GET /api/orders/:id

获取工单详情（含事件列表和命令日志）。

### POST /api/orders

创建工单。

请求体：
```json
{
  "title": "1号盘柜",
  "target_x": 100,
  "target_y": 200,
  "target_node": "A3",
  "assigned_worker_id": 2,
  "notes": ""
}
```

### PUT /api/orders/:id

更新工单信息。

### DELETE /api/orders/:id

删除工单（仅 draft/pending 状态可删除）。

## 4. 人员接口

### GET /api/workers

获取人员列表。

### POST /api/workers

创建人员。

请求体：
```json
{
  "worker_no": "W001",
  "name": "张三",
  "password": "123456",
  "role": "operator",
  "phone": "13800138000"
}
```

### PUT /api/workers/:id

更新人员信息。

### DELETE /api/workers/:id

删除人员。

### POST /api/workers/:id/reset-password

重置密码。

## 5. 报警接口

### GET /api/alarms

获取报警列表。

查询参数：
| 参数 | 类型 | 说明 |
|------|------|------|
| level | string | 按等级筛选 |
| code | string | 按代码筛选 |
| from | string | 开始日期 |
| to | string | 结束日期 |

### PUT /api/alarms/:id/handle

标记报警为已处理。

## 6. 统计接口

### GET /api/stats/orders

工单统计数据。

查询参数：
| 参数 | 类型 | 说明 |
|------|------|------|
| days | number | 最近 N 天，默认 7 |

响应：
```json
{
  "daily": [
    { "date": "2026-05-21", "total": 5, "completed": 4, "failed": 1 }
  ],
  "summary": {
    "total": 35,
    "completed": 30,
    "avg_duration_s": 120
  }
}
```

### GET /api/stats/alarms

报警统计数据。

### GET /api/stats/export

导出 CSV 数据。

查询参数：
| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | orders / alarms |
| from | string | 开始日期 |
| to | string | 结束日期 |
