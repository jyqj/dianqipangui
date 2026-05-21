# 2026-05 协议与闭环优化摘要

## 已收口

- 上位机与 App 认证字段统一为 `worker_no/password`，返回同时兼容 `{ ok, msg, worker, token }`。
- Web 管理端新增管理员登录，未认证 Socket 不能调用 `web:*` 管理事件。
- 工单启动命令统一为 `order_start`，App 映射为小车 `trace_start`。
- 命令 ACK 统一为 `{ cmd_id, stage, ok, msg }`，支持 `app_ack`、`car_ack`、`done`。
- App 遥测上报统一转换为上位机 snake_case：`move_state`、`estimated_x`、`progress_pct`、`battery_v` 等。
- App 工单事件统一为 `{ order_id, event_type, status, message }`。
- H5 构建脚本改为本地 Vite/uni 依赖，可通过 `npm install && npm run build:h5` 复现。

## 当前仍是预留

- 真实 BLE 连接仍待嵌入式联调完成后接入。
- REST API 文档仍为规划，当前实现以 Socket.IO 为准。
- `npm audit` 仍报告 DCloud/前端依赖链漏洞，需要结合 uni-app 版本升级窗口单独治理。
