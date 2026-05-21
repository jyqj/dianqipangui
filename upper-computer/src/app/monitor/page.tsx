"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocketContext } from "../../lib/socketContext";
import MonitorCanvas from "../../components/MonitorCanvas";
import CommandPanel from "../../components/CommandPanel";
import {
  OctagonX,
  Gamepad2,
  Unlock,
  Battery,
  Gauge,
  Radio,
  Navigation,
  Cog,
  ArrowUpDown,
  Radar,
} from "lucide-react";
import type { CommandLog } from "../../shared/protocol";

export default function MonitorPage() {
  const { telemetry, bridgeState, appOnline, emitWithAck, emit } =
    useSocketContext();

  const [recentCommands, setRecentCommands] = useState<CommandLog[]>([]);
  const [isTakeover, setIsTakeover] = useState(false);

  const loadCommands = useCallback(async () => {
    try {
      const cmds = await emitWithAck<CommandLog[]>("web:get_commands", 15);
      setRecentCommands(cmds);
    } catch (err) {
      console.error("加载命令失败:", err);
    }
  }, [emitWithAck]);

  useEffect(() => {
    loadCommands();
    const timer = setInterval(loadCommands, 5000);
    return () => clearInterval(timer);
  }, [loadCommands]);

  const handleEstop = () => {
    if (!confirm("确认发送急停命令？")) return;
    emit("web:estop");
    loadCommands();
  };

  const handleTakeover = () => {
    if (isTakeover) {
      emit("web:release");
      setIsTakeover(false);
    } else {
      if (!confirm("确认接管控制权？")) return;
      emit("web:takeover");
      setIsTakeover(true);
    }
    loadCommands();
  };

  return (
    <div className="space-y-4">
      {/* 顶部控制栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">实时监控</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            小车位置追踪与远程控制
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleEstop}
            className="btn-danger flex items-center gap-2 px-6 py-2.5 text-base font-bold animate-none hover:animate-pulse"
          >
            <OctagonX className="w-5 h-5" />
            急停
          </button>
          <button
            onClick={handleTakeover}
            className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-lg transition-all ${
              isTakeover
                ? "bg-yellow-600 hover:bg-yellow-500 text-white"
                : "btn-warning"
            }`}
          >
            {isTakeover ? (
              <>
                <Unlock className="w-4 h-4" />
                释放控制
              </>
            ) : (
              <>
                <Gamepad2 className="w-4 h-4" />
                接管控制
              </>
            )}
          </button>
        </div>
      </div>

      {/* 主体：地图 + 状态面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: "calc(100vh - 260px)" }}>
        {/* 地图画布 */}
        <div className="lg:col-span-3 card overflow-hidden">
          <MonitorCanvas
            telemetry={telemetry}
            targetX={undefined}
            targetY={undefined}
          />
        </div>

        {/* 实时状态面板 */}
        <div className="card p-4 space-y-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-300 border-b border-gray-800 pb-2">
            实时状态
          </h3>

          {/* APP 连接 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                appOnline ? "bg-green-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-400">
              APP: {appOnline ? "在线" : "离线"}
            </span>
          </div>

          {/* BLE 连接 */}
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                bridgeState?.ble_connected
                  ? "bg-green-500"
                  : "bg-gray-600"
              }`}
            />
            <span className="text-sm text-gray-400">
              BLE:{" "}
              {bridgeState?.ble_connected
                ? bridgeState.ble_device_name || "已连接"
                : "未连接"}
            </span>
          </div>

          <hr className="border-gray-800" />

          {telemetry ? (
            <>
              {/* 运行模式 */}
              <StatusItem
                icon={<Cog className="w-4 h-4" />}
                label="运行模式"
                value={telemetry.mode}
              />

              {/* 移动状态 */}
              <StatusItem
                icon={<Navigation className="w-4 h-4" />}
                label="移动状态"
                value={telemetry.move_state}
              />

              {/* 吊装状态 */}
              <StatusItem
                icon={<ArrowUpDown className="w-4 h-4" />}
                label="吊装状态"
                value={telemetry.lift_state}
              />

              {/* 位置 */}
              <StatusItem
                icon={<Radar className="w-4 h-4" />}
                label="当前位置"
                value={`(${telemetry.estimated_x.toFixed(2)}, ${telemetry.estimated_y.toFixed(2)})`}
              />

              {/* 进度 */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    任务进度
                  </span>
                  <span>{telemetry.progress_pct}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${telemetry.progress_pct}%` }}
                  />
                </div>
              </div>

              {/* 电池 */}
              <StatusItem
                icon={<Battery className="w-4 h-4" />}
                label="电池电压"
                value={`${telemetry.battery_v.toFixed(1)}V`}
                color={
                  telemetry.battery_v < 22
                    ? "text-red-400"
                    : telemetry.battery_v < 24
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              />

              {/* 障碍物 */}
              <StatusItem
                icon={<Radar className="w-4 h-4" />}
                label="障碍物距离"
                value={`${telemetry.obstacle_cm}cm`}
                color={
                  telemetry.obstacle_cm < 20
                    ? "text-red-400"
                    : telemetry.obstacle_cm < 50
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              />

              {/* RSSI */}
              <StatusItem
                icon={<Radio className="w-4 h-4" />}
                label="信号强度"
                value={`${telemetry.rssi} dBm`}
                color={
                  telemetry.rssi < -80
                    ? "text-red-400"
                    : telemetry.rssi < -60
                    ? "text-yellow-400"
                    : "text-green-400"
                }
              />
            </>
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">
              等待遥测数据...
            </div>
          )}
        </div>
      </div>

      {/* 命令回执面板 */}
      <CommandPanel commands={recentCommands} />
    </div>
  );
}

function StatusItem({
  icon,
  label,
  value,
  color = "text-gray-200",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs text-gray-400">
        {icon}
        {label}
      </span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}
