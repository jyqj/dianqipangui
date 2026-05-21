"use client";

import { useState, useEffect, useCallback } from "react";
import { useSocketContext } from "../../lib/socketContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, RefreshCw, Calendar } from "lucide-react";

interface OrderStat {
  date: string;
  status: string;
  cnt: number;
}

interface AlarmStat {
  date: string;
  level: string;
  cnt: number;
}

interface DailyOrder {
  date: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
  other: number;
}

interface DailyAlarm {
  date: string;
  critical: number;
  warning: number;
  info: number;
}

const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#eab308", "#8b5cf6"];

export default function HistoryPage() {
  const { emitWithAck } = useSocketContext();

  const [days, setDays] = useState(7);
  const [orderData, setOrderData] = useState<DailyOrder[]>([]);
  const [alarmData, setAlarmData] = useState<DailyAlarm[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await emitWithAck<{
        orderStats: OrderStat[];
        alarmStats: AlarmStat[];
      }>("web:get_history_stats", { days });

      // 聚合工单数据
      const orderMap = new Map<string, DailyOrder>();
      for (const item of result.orderStats) {
        if (!orderMap.has(item.date)) {
          orderMap.set(item.date, {
            date: item.date,
            total: 0,
            completed: 0,
            failed: 0,
            running: 0,
            other: 0,
          });
        }
        const entry = orderMap.get(item.date)!;
        entry.total += item.cnt;
        if (item.status === "completed") entry.completed += item.cnt;
        else if (item.status === "failed") entry.failed += item.cnt;
        else if (item.status === "running") entry.running += item.cnt;
        else entry.other += item.cnt;
      }
      setOrderData(
        Array.from(orderMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );

      // 聚合报警数据
      const alarmMap = new Map<string, DailyAlarm>();
      for (const item of result.alarmStats) {
        if (!alarmMap.has(item.date)) {
          alarmMap.set(item.date, {
            date: item.date,
            critical: 0,
            warning: 0,
            info: 0,
          });
        }
        const entry = alarmMap.get(item.date)!;
        if (item.level === "critical") entry.critical += item.cnt;
        else if (item.level === "warning") entry.warning += item.cnt;
        else entry.info += item.cnt;
      }
      setAlarmData(
        Array.from(alarmMap.values()).sort((a, b) =>
          a.date.localeCompare(b.date)
        )
      );
    } catch (err) {
      console.error("加载历史数据失败:", err);
    } finally {
      setLoading(false);
    }
  }, [emitWithAck, days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportCsv = () => {
    // 工单 CSV
    let csv = "日期,总数,已完成,失败,执行中,其他\n";
    for (const row of orderData) {
      csv += `${row.date},${row.total},${row.completed},${row.failed},${row.running},${row.other}\n`;
    }
    csv += "\n日期,严重,警告,信息\n";
    for (const row of alarmData) {
      csv += `${row.date},${row.critical},${row.warning},${row.info}\n`;
    }

    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `历史统计_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 汇总用于饼图
  const totalOrders = orderData.reduce(
    (acc, d) => ({
      completed: acc.completed + d.completed,
      failed: acc.failed + d.failed,
      running: acc.running + d.running,
      other: acc.other + d.other,
    }),
    { completed: 0, failed: 0, running: 0, other: 0 }
  );

  const pieData = [
    { name: "已完成", value: totalOrders.completed },
    { name: "失败", value: totalOrders.failed },
    { name: "执行中", value: totalOrders.running },
    { name: "其他", value: totalOrders.other },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">历史统计</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            工单趋势与报警统计分析
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              className="input w-32"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
            >
              <option value={7}>最近7天</option>
              <option value={14}>最近14天</option>
              <option value={30}>最近30天</option>
              <option value={90}>最近90天</option>
            </select>
          </div>
          <button
            onClick={loadData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            刷新
          </button>
          <button
            onClick={exportCsv}
            className="btn-primary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出 CSV
          </button>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 工单趋势 */}
        <div className="lg:col-span-2 card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            工单趋势
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.substring(5)}
              />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                }}
              />
              <Legend />
              <Bar
                dataKey="completed"
                name="已完成"
                fill="#22c55e"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="failed"
                name="失败"
                fill="#ef4444"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="running"
                name="执行中"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="other"
                name="其他"
                fill="#64748b"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 工单状态饼图 */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">
            工单状态分布
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#e2e8f0",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500 text-sm">
              暂无数据
            </div>
          )}
        </div>
      </div>

      {/* 报警趋势 */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">
          报警趋势
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={alarmData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => value.substring(5)}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "8px",
                color: "#e2e8f0",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="critical"
              name="严重"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="warning"
              name="警告"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="info"
              name="信息"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
