"use client";

import {
  Play,
  Pause,
  RotateCcw,
  XCircle,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import { OrderStatusLabel } from "../shared/enums";

interface Order {
  id: number;
  order_no: string;
  title: string;
  target_x?: number;
  target_y?: number;
  target_node?: string;
  worker_name?: string;
  status: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  duration_s?: number;
}

interface OrderTableProps {
  orders: Order[];
  onStart: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
  onCancel: (id: number) => void;
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "badge-gray";
    case "pending":
      return "badge-blue";
    case "dispatching":
      return "badge-yellow";
    case "running":
      return "badge-blue";
    case "paused":
      return "badge-yellow";
    case "completed":
      return "badge-green";
    case "failed":
      return "badge-red";
    case "cancelled":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}分${s}秒`;
}

export default function OrderTable({
  orders,
  onStart,
  onPause,
  onResume,
  onCancel,
  onEdit,
  onDelete,
}: OrderTableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-striped">
          <thead>
            <tr className="text-gray-400 text-xs border-b border-gray-800 bg-gray-900/50">
              <th className="text-left px-4 py-3">工单号</th>
              <th className="text-left px-4 py-3">标题</th>
              <th className="text-left px-4 py-3">目标位置</th>
              <th className="text-left px-4 py-3">操作员</th>
              <th className="text-center px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">创建时间</th>
              <th className="text-left px-4 py-3">耗时</th>
              <th className="text-center px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                  暂无工单数据
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-blue-400">
                    {order.order_no}
                  </td>
                  <td className="px-4 py-3 text-gray-200">{order.title}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {order.target_node
                      ? order.target_node
                      : order.target_x != null
                      ? `(${order.target_x}, ${order.target_y})`
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {order.worker_name || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={statusBadgeClass(order.status)}>
                      {OrderStatusLabel[order.status] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {order.duration_s ? formatDuration(order.duration_s) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {(order.status === "draft" ||
                        order.status === "pending") && (
                        <>
                          <button
                            onClick={() => onStart(order.id)}
                            className="p-1.5 text-green-400 hover:bg-green-400/10 rounded transition-colors"
                            title="启动"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(order)}
                            className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition-colors"
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(order.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === "running" && (
                        <>
                          <button
                            onClick={() => onPause(order.id)}
                            className="p-1.5 text-yellow-400 hover:bg-yellow-400/10 rounded transition-colors"
                            title="暂停"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onCancel(order.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="取消"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === "paused" && (
                        <>
                          <button
                            onClick={() => onResume(order.id)}
                            className="p-1.5 text-green-400 hover:bg-green-400/10 rounded transition-colors"
                            title="继续"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onCancel(order.id)}
                            className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="取消"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {order.status === "dispatching" && (
                        <button
                          onClick={() => onCancel(order.id)}
                          className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors"
                          title="取消"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
