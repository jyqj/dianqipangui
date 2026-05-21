"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocketContext } from "../lib/socketContext";
import StatusCards from "../components/StatusCards";
import CommandPanel from "../components/CommandPanel";
import { AlertTriangle, Clock, Activity } from "lucide-react";
import type { CommandLog, AlarmEvent } from "../shared/protocol";
import { AlarmLevelLabel, AlarmCodeLabel } from "../shared/enums";

export default function DashboardPage() {
  const { appOnline, bridgeState, telemetry, recentAlarms, emitWithAck } =
    useSocketContext();

  const [todayStats, setTodayStats] = useState({
    total: 0,
    completed: 0,
    running: 0,
    failed: 0,
  });
  const [recentCommands, setRecentCommands] = useState<CommandLog[]>([]);

  const loadData = useCallback(async () => {
    try {
      const stats = await emitWithAck<{
        total: number;
        completed: number;
        running: number;
        failed: number;
      }>("web:get_today_stats");
      setTodayStats(stats);

      const cmds = await emitWithAck<CommandLog[]>("web:get_commands", 10);
      setRecentCommands(cmds);
    } catch (err) {
      console.error("加载仪表盘数据失败:", err);
    }
  }, [emitWithAck]);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">仪表盘</h1>
          <p className="text-sm text-gray-500 mt-0.5">系统概览与实时状态</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Activity className="w-3.5 h-3.5" />
          <span>实时更新</span>
        </div>
      </div>

      {/* 状态卡片 */}
      <StatusCards
        appOnline={appOnline}
        bridgeState={bridgeState}
        telemetry={telemetry}
        todayStats={todayStats}
      />

      {/* 下半部分：命令 + 报警 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 最近命令 */}
        <CommandPanel commands={recentCommands} />

        {/* 最近报警 */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-medium text-gray-200">最近报警</h3>
            <span className="text-xs text-gray-500">
              ({recentAlarms.length})
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {recentAlarms.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                暂无报警
              </div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {recentAlarms.slice(0, 10).map((alarm, idx) => (
                  <div
                    key={idx}
                    className="px-4 py-3 flex items-start gap-3 hover:bg-gray-800/30 transition-colors"
                  >
                    <div
                      className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                        alarm.level === "critical"
                          ? "bg-red-500"
                          : alarm.level === "warning"
                          ? "bg-yellow-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${
                            alarm.level === "critical"
                              ? "text-red-400"
                              : alarm.level === "warning"
                              ? "text-yellow-400"
                              : "text-blue-400"
                          }`}
                        >
                          [{AlarmLevelLabel[alarm.level] || alarm.level}]
                        </span>
                        <span className="text-sm text-gray-300">
                          {AlarmCodeLabel[alarm.code] || alarm.code}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {alarm.msg}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-600 flex-shrink-0">
                      {alarm.ts
                        ? new Date(alarm.ts).toLocaleTimeString("zh-CN")
                        : "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
