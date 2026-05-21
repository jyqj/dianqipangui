"use client";

import { useState } from "react";
import { useSocketContext } from "../../lib/socketContext";
import {
  Settings,
  Server,
  Database,
  Wifi,
  Shield,
  Bell,
  Monitor,
  Save,
  RotateCcw,
} from "lucide-react";

interface ConfigSection {
  title: string;
  icon: React.ReactNode;
  items: ConfigItem[];
}

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  type: "text" | "number" | "toggle" | "select";
  value: string | number | boolean;
  options?: { label: string; value: string }[];
}

export default function SettingsPage() {
  const { isConnected, appOnline } = useSocketContext();

  const [configs, setConfigs] = useState<ConfigSection[]>([
    {
      title: "服务器配置",
      icon: <Server className="w-5 h-5 text-blue-400" />,
      items: [
        {
          key: "server_port",
          label: "服务端口",
          description: "上位机 HTTP/WebSocket 服务端口",
          type: "number",
          value: 3000,
        },
        {
          key: "socket_ping_interval",
          label: "心跳间隔 (ms)",
          description: "Socket.IO ping 间隔时间",
          type: "number",
          value: 25000,
        },
        {
          key: "socket_ping_timeout",
          label: "心跳超时 (ms)",
          description: "Socket.IO ping 超时时间",
          type: "number",
          value: 60000,
        },
      ],
    },
    {
      title: "数据库配置",
      icon: <Database className="w-5 h-5 text-green-400" />,
      items: [
        {
          key: "db_path",
          label: "数据库路径",
          description: "SQLite 数据库文件路径",
          type: "text",
          value: "./data/upper-computer.db",
        },
        {
          key: "telemetry_sample_interval",
          label: "遥测采样间隔 (ms)",
          description: "遥测数据写入数据库的采样频率",
          type: "number",
          value: 5000,
        },
      ],
    },
    {
      title: "通信配置",
      icon: <Wifi className="w-5 h-5 text-yellow-400" />,
      items: [
        {
          key: "command_timeout",
          label: "命令超时 (ms)",
          description: "命令等待 ACK 的超时时间",
          type: "number",
          value: 10000,
        },
        {
          key: "command_retry_count",
          label: "命令重试次数",
          description: "命令超时后的最大重试次数",
          type: "number",
          value: 3,
        },
        {
          key: "auto_reconnect",
          label: "自动重连",
          description: "APP 断开后是否自动尝试重连",
          type: "toggle",
          value: true,
        },
      ],
    },
    {
      title: "安全配置",
      icon: <Shield className="w-5 h-5 text-purple-400" />,
      items: [
        {
          key: "jwt_expires",
          label: "Token 有效期",
          description: "JWT Token 过期时间",
          type: "select",
          value: "24h",
          options: [
            { label: "1小时", value: "1h" },
            { label: "8小时", value: "8h" },
            { label: "24小时", value: "24h" },
            { label: "7天", value: "7d" },
          ],
        },
        {
          key: "require_auth",
          label: "强制认证",
          description: "APP 连接是否必须认证",
          type: "toggle",
          value: true,
        },
      ],
    },
    {
      title: "报警配置",
      icon: <Bell className="w-5 h-5 text-red-400" />,
      items: [
        {
          key: "alarm_sound",
          label: "报警声音",
          description: "严重报警时是否播放声音",
          type: "toggle",
          value: true,
        },
        {
          key: "obstacle_warning_cm",
          label: "障碍物预警距离 (cm)",
          description: "障碍物距离低于此值时发出预警",
          type: "number",
          value: 50,
        },
        {
          key: "low_battery_v",
          label: "低电量阈值 (V)",
          description: "电池电压低于此值时报警",
          type: "number",
          value: 22.0,
        },
      ],
    },
    {
      title: "显示配置",
      icon: <Monitor className="w-5 h-5 text-cyan-400" />,
      items: [
        {
          key: "map_grid_size",
          label: "地图网格大小 (px)",
          description: "监控地图的网格间距",
          type: "number",
          value: 50,
        },
        {
          key: "trajectory_max_points",
          label: "轨迹最大点数",
          description: "地图上保留的轨迹历史点数",
          type: "number",
          value: 500,
        },
        {
          key: "dashboard_refresh",
          label: "仪表盘刷新间隔 (ms)",
          description: "仪表盘数据自动刷新间隔",
          type: "number",
          value: 10000,
        },
      ],
    },
  ]);

  const updateConfig = (
    sectionIdx: number,
    itemIdx: number,
    value: string | number | boolean
  ) => {
    const newConfigs = [...configs];
    newConfigs[sectionIdx].items[itemIdx].value = value;
    setConfigs(newConfigs);
  };

  const handleSave = () => {
    // 实际保存逻辑（需对接后端）
    alert("配置已保存（演示模式：配置未持久化到后端）");
  };

  const handleReset = () => {
    if (!confirm("确认重置所有配置为默认值？")) return;
    // 重新加载页面
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">系统设置</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            配置系统运行参数
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            重置默认
          </button>
          <button
            onClick={handleSave}
            className="btn-primary flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存配置
          </button>
        </div>
      </div>

      {/* 系统状态 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          系统状态
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-gray-400">WebSocket:</span>
            <span className={isConnected ? "text-green-400" : "text-red-400"}>
              {isConnected ? "已连接" : "断开"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                appOnline ? "bg-green-500" : "bg-gray-600"
              }`}
            />
            <span className="text-gray-400">APP:</span>
            <span className={appOnline ? "text-green-400" : "text-gray-500"}>
              {appOnline ? "在线" : "离线"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">系统版本:</span>
            <span className="text-gray-200">v1.0.0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">运行环境:</span>
            <span className="text-gray-200">
              {process.env.NODE_ENV || "development"}
            </span>
          </div>
        </div>
      </div>

      {/* 配置项 */}
      {configs.map((section, sectionIdx) => (
        <div key={section.title} className="card">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
            {section.icon}
            <h3 className="text-sm font-semibold text-gray-200">
              {section.title}
            </h3>
          </div>
          <div className="divide-y divide-gray-800/50">
            {section.items.map((item, itemIdx) => (
              <div
                key={item.key}
                className="px-6 py-4 flex items-center justify-between hover:bg-gray-800/20 transition-colors"
              >
                <div className="flex-1 mr-8">
                  <p className="text-sm text-gray-200">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
                <div className="flex-shrink-0 w-48">
                  {item.type === "text" && (
                    <input
                      type="text"
                      className="input"
                      value={item.value as string}
                      onChange={(e) =>
                        updateConfig(sectionIdx, itemIdx, e.target.value)
                      }
                    />
                  )}
                  {item.type === "number" && (
                    <input
                      type="number"
                      className="input"
                      value={item.value as number}
                      onChange={(e) =>
                        updateConfig(
                          sectionIdx,
                          itemIdx,
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  )}
                  {item.type === "toggle" && (
                    <button
                      onClick={() =>
                        updateConfig(sectionIdx, itemIdx, !item.value)
                      }
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        item.value ? "bg-blue-600" : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          item.value ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  )}
                  {item.type === "select" && item.options && (
                    <select
                      className="input"
                      value={item.value as string}
                      onChange={(e) =>
                        updateConfig(sectionIdx, itemIdx, e.target.value)
                      }
                    >
                      {item.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
