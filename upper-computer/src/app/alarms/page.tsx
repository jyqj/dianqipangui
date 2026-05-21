"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocketContext } from "../../lib/socketContext";
import {
  AlertTriangle,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
  Info,
} from "lucide-react";
import {
  AlarmLevel,
  AlarmLevelLabel,
  AlarmCode,
  AlarmCodeLabel,
} from "../../shared/enums";
import type { AlarmRecord } from "../../shared/protocol";

export default function AlarmsPage() {
  const { emitWithAck, recentAlarms } = useSocketContext();

  const [alarms, setAlarms] = useState<AlarmRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterLevel, setFilterLevel] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const loadAlarms = useCallback(async () => {
    setLoading(true);
    try {
      const filter: Record<string, string | number> = { limit: 200 };
      if (filterLevel) filter.level = filterLevel;
      if (filterCode) filter.code = filterCode;
      if (filterDateFrom) filter.date_from = filterDateFrom;
      if (filterDateTo) filter.date_to = filterDateTo;

      const data = await emitWithAck<AlarmRecord[]>("web:get_alarms", filter);
      setAlarms(data);
    } catch (err) {
      console.error("加载报警失败:", err);
    } finally {
      setLoading(false);
    }
  }, [emitWithAck, filterLevel, filterCode, filterDateFrom, filterDateTo]);

  useEffect(() => {
    loadAlarms();
  }, [loadAlarms]);

  // 新报警时自动刷新
  useEffect(() => {
    if (recentAlarms.length > 0) {
      loadAlarms();
    }
  }, [recentAlarms.length, loadAlarms]);

  function levelIcon(level: string) {
    switch (level) {
      case "critical":
        return <AlertOctagon className="w-4 h-4 text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-400" />;
    }
  }

  function levelRowClass(level: string): string {
    switch (level) {
      case "critical":
        return "border-l-2 border-l-red-500";
      case "warning":
        return "border-l-2 border-l-yellow-500";
      default:
        return "border-l-2 border-l-blue-500";
    }
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">报警日志</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            查看和管理系统报警记录
          </p>
        </div>
        <button
          onClick={loadAlarms}
          className="btn-secondary flex items-center gap-2"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      {/* 筛选 */}
      <div className="card px-4 py-3 flex flex-wrap items-center gap-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <select
          className="input w-36"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="">全部等级</option>
          {Object.values(AlarmLevel).map((level) => (
            <option key={level} value={level}>
              {AlarmLevelLabel[level]}
            </option>
          ))}
        </select>
        <select
          className="input w-40"
          value={filterCode}
          onChange={(e) => setFilterCode(e.target.value)}
        >
          <option value="">全部类型</option>
          {Object.values(AlarmCode).map((code) => (
            <option key={code} value={code}>
              {AlarmCodeLabel[code]}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="input w-40"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          placeholder="开始日期"
        />
        <span className="text-gray-500">~</span>
        <input
          type="date"
          className="input w-40"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          placeholder="结束日期"
        />
        <span className="text-xs text-gray-500 ml-auto">
          共 {alarms.length} 条记录
        </span>
      </div>

      {/* 报警表格 */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm table-striped">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-3">等级</th>
              <th className="text-left px-4 py-3">报警类型</th>
              <th className="text-left px-4 py-3">描述</th>
              <th className="text-left px-4 py-3">来源</th>
              <th className="text-left px-4 py-3">工单ID</th>
              <th className="text-center px-4 py-3">已处理</th>
              <th className="text-left px-4 py-3">时间</th>
            </tr>
          </thead>
          <tbody>
            {alarms.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  暂无报警记录
                </td>
              </tr>
            ) : (
              alarms.map((alarm) => (
                <tr
                  key={alarm.id}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${levelRowClass(
                    alarm.level
                  )}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {levelIcon(alarm.level)}
                      <span
                        className={
                          alarm.level === "critical"
                            ? "text-red-400 font-medium"
                            : alarm.level === "warning"
                            ? "text-yellow-400"
                            : "text-blue-400"
                        }
                      >
                        {AlarmLevelLabel[alarm.level] || alarm.level}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-200">
                    {AlarmCodeLabel[alarm.code] || alarm.code}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                    {alarm.message || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {alarm.source || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                    {alarm.order_id || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {alarm.handled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {alarm.created_at
                      ? new Date(alarm.created_at).toLocaleString("zh-CN")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
