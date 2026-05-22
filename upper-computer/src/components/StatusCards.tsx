"use client";

import {
  Smartphone,
  Bluetooth,
  Truck,
  ClipboardCheck,
} from "lucide-react";
import type { BridgeState, TelemetryFrame } from "../shared/protocol";

interface StatusCardsProps {
  appOnline: boolean;
  bridgeState: BridgeState | null;
  telemetry: TelemetryFrame | null;
  todayStats: { total: number; completed: number; running: number; failed: number };
}

interface CardProps {
  title: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  status: "online" | "offline" | "warning" | "neutral";
}

function StatusCard({ title, value, subtext, icon, status }: CardProps) {
  const statusColors = {
    online: "border-green-500/30 bg-green-500/5",
    offline: "border-red-500/30 bg-red-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    neutral: "border-gray-700 bg-gray-800/50",
  };

  const iconColors = {
    online: "text-green-400",
    offline: "text-red-400",
    warning: "text-yellow-400",
    neutral: "text-gray-400",
  };

  const dotColors = {
    online: "bg-green-500",
    offline: "bg-red-500",
    warning: "bg-yellow-500",
    neutral: "bg-gray-500",
  };

  return (
    <div
      className={`card p-4 border ${statusColors[status]} transition-all duration-300`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">{title}</p>
          <p className="text-lg font-bold text-white">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtext}</p>
        </div>
        <div className={`p-2 rounded-lg bg-gray-800 ${iconColors[status]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3">
        <div
          className={`w-1.5 h-1.5 rounded-full ${dotColors[status]} ${
            status === "online" ? "animate-pulse" : ""
          }`}
        />
        <span className="text-[10px] text-gray-500">
          {status === "online"
            ? "在线"
            : status === "offline"
            ? "离线"
            : status === "warning"
            ? "异常"
            : "未知"}
        </span>
      </div>
    </div>
  );
}

export default function StatusCards({
  appOnline,
  bridgeState,
  telemetry,
  todayStats,
}: StatusCardsProps) {
  const bleConnected = bridgeState?.ble_connected ?? false;
  const moveState = telemetry?.move_state ?? "未知";
  const completionRate =
    todayStats.total > 0
      ? Math.round((todayStats.completed / todayStats.total) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusCard
        title="APP 状态"
        value={appOnline ? "已连接" : "未连接"}
        subtext={
          bridgeState
            ? `v${bridgeState.app_version}`
            : "等待连接..."
        }
        icon={<Smartphone className="w-5 h-5" />}
        status={appOnline ? "online" : "offline"}
      />
      <StatusCard
        title="BLE 状态"
        value={bleConnected ? "已连接" : "未连接"}
        subtext={
          bridgeState?.ble_device_name
            ? `设备: ${bridgeState.ble_device_name}`
            : "无设备"
        }
        icon={<Bluetooth className="w-5 h-5" />}
        status={bleConnected ? "online" : appOnline ? "warning" : "offline"}
      />
      <StatusCard
        title="小车状态"
        value={moveState}
        subtext={
          telemetry
            ? `电量: ${telemetry.battery_v.toFixed(1)}V | 障碍: ${telemetry.obstacle_cm}cm`
            : "无数据"
        }
        icon={<Truck className="w-5 h-5" />}
        status={
          telemetry
            ? telemetry.obstacle_cm < 30
              ? "warning"
              : "online"
            : "neutral"
        }
      />
      <StatusCard
        title="今日工单"
        value={`${todayStats.completed}/${todayStats.total}`}
        subtext={`完成率: ${completionRate}% | 执行中: ${todayStats.running} | 失败: ${todayStats.failed}`}
        icon={<ClipboardCheck className="w-5 h-5" />}
        status={
          todayStats.failed > 0
            ? "warning"
            : todayStats.total > 0
            ? "online"
            : "neutral"
        }
      />
    </div>
  );
}
