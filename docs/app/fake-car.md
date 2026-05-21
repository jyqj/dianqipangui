# 模拟小车设计 (FakeCarTransport)

## 1. 定位

**当前最关键的模块。** 嵌入式未完成，FakeCarTransport 让 App 和上位机能独立完成全部软件联调。

FakeCarTransport 实现了与 BleCarTransport 完全相同的 CarTransport 接口，App 页面代码无需区分真实还是模拟。

## 2. 接口实现

```javascript
class FakeCarTransport extends CarTransport {
  connect()           // 立即返回成功
  disconnect()        // 停止模拟
  sendCommand(cmd)    // 处理模拟逻辑
  onStatus(callback)  // 注册状态回调
  onAlarm(callback)   // 注册报警回调
  isConnected()       // 始终返回 true
}
```

## 3. 支持的命令

| 命令 | 模拟行为 |
|------|---------|
| `{"c":"move","dx":0.3,"dy":0.1,"spd":2}` | 按 dx/dy 改变 estimated_pos，move_state = moving |
| `{"c":"stop"}` | move_state = idle |
| `{"c":"lift","dir":"up"}` | lift_height_mm 递增，lift_state = up |
| `{"c":"lift","dir":"down"}` | lift_height_mm 递减，lift_state = down |
| `{"c":"lift","dir":"stop"}` | lift_state = idle |
| `{"c":"trace","target":{"x":100,"y":200}}` | 开始模拟循迹 |
| `{"c":"estop"}` | 立即停止，mode = estop |
| `{"c":"reset"}` | 恢复到 idle |
| `{"c":"ping"}` | 返回当前状态 |

## 4. 模拟循迹逻辑 (trace)

收到 trace 命令后：

```
1. mode = auto, move_state = tracing
2. progress_pct 从 0 开始
3. 每 500ms:
   - progress_pct += 3（约 16 秒完成）
   - estimated_pos 沿预设路径插值
   - estimated_heading 跟随路径方向
   - battery_v 缓慢下降（模拟真实）
   - obstacle_cm 随机波动 20-50
4. progress_pct 达到 100:
   - move_state = idle
   - mode = idle
   - 触发 onOrderDone 回调
```

## 5. 预设路径

模拟循迹的路径为一条简单折线：

```javascript
const FAKE_PATH = [
  { x: 0,   y: 0 },
  { x: 50,  y: 0 },
  { x: 50,  y: 80 },
  { x: 120, y: 80 },
  { x: 120, y: 150 },
  { x: 200, y: 150 },
]
```

根据 progress_pct 在路径上线性插值，计算当前 estimated_pos 和 estimated_heading。

## 6. 模拟状态帧

每 500ms 生成一帧：

```json
{
  "mode": "auto",
  "move_state": "tracing",
  "lift_state": "idle",
  "progress_pct": 46,
  "estimated_pos": { "x": 138, "y": 76 },
  "estimated_heading": 90,
  "estimated_lift_height_mm": 80,
  "battery_v": 11.7,
  "obstacle_cm": 31,
  "ir_sensors": [1, 1, 0, 1],
  "rssi": -48
}
```

通过 onStatus 回调传给 App → 和真实 BLE 走同一条数据路径：

```
FakeCarTransport.onStatus(callback)
  → callback(statusFrame)
    → carStore 更新
      → Socket.IO emit app:telemetry
        → 上位机监控页刷新
```

## 7. 模拟推杆

```
lift up:
  lift_state = up
  每 100ms: estimated_lift_height_mm += 5
  达到 200mm 时自动停止

lift down:
  lift_state = down
  每 100ms: estimated_lift_height_mm -= 5
  达到 0mm 时自动停止

lift stop:
  lift_state = idle
  高度保持不变
```

## 8. 模拟急停

```
estop:
  mode = estop
  move_state = stopped
  lift_state = stopped
  清除所有进行中的模拟定时器
  触发 onAlarm({code: "ESTOP_LOCAL"})
```

## 9. 模拟电池与障碍

- `battery_v`：初始 12.0，每秒下降 0.01，最低 10.5
- `obstacle_cm`：随机 20-50，偶尔模拟 8cm 触发障碍报警
- `ir_sensors`：正常循迹 [1,1,0,1]，偏离时变化

## 10. 切换真实模式

设置页关闭 `simulate_mode` 后：

```
App 销毁 FakeCarTransport
创建 BleCarTransport
调用 BleScanner 扫描设备
选择设备 → connect
后续所有操作走真实 BLE
```

上位机逻辑、Socket.IO 通信、页面 UI 完全不变。
