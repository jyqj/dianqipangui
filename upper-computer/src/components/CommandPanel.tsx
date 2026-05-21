"use client";

import { Terminal, Check, X, Clock, Loader2 } from "lucide-react";
import type { CommandLog } from "../shared/protocol";

interface CommandPanelProps {
  commands: CommandLog[];
}

function AckIcon({ ack }: { ack: number }) {
  if (ack === 1) return <Check className="w-3.5 h-3.5 text-green-400" />;
  return <Clock className="w-3.5 h-3.5 text-gray-500" />;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    created: { color: "badge-gray", label: "已创建" },
    app_acked: { color: "badge-blue", label: "APP已确认" },
    app_rejected: { color: "badge-red", label: "APP拒绝" },
    car_acked: { color: "badge-green", label: "小车已确认" },
    car_rejected: { color: "badge-red", label: "小车拒绝" },
    completed: { color: "badge-green", label: "完成" },
    failed: { color: "badge-red", label: "失败" },
  };

  const info = map[status] || { color: "badge-gray", label: status };

  return <span className={info.color}>{info.label}</span>;
}

export default function CommandPanel({ commands }: CommandPanelProps) {
  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-medium text-gray-200">命令回执</h3>
        <span className="text-xs text-gray-500">({commands.length})</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {commands.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            暂无命令记录
          </div>
        ) : (
          <table className="w-full text-sm table-striped">
            <thead>
              <tr className="text-gray-400 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-2">命令ID</th>
                <th className="text-left px-4 py-2">类型</th>
                <th className="text-center px-4 py-2">APP ACK</th>
                <th className="text-center px-4 py-2">小车 ACK</th>
                <th className="text-left px-4 py-2">状态</th>
                <th className="text-left px-4 py-2">时间</th>
              </tr>
            </thead>
            <tbody>
              {commands.map((cmd) => (
                <tr key={cmd.cmd_id} className="border-b border-gray-800/50">
                  <td className="px-4 py-2 font-mono text-xs text-gray-400">
                    {cmd.cmd_id.substring(0, 16)}...
                  </td>
                  <td className="px-4 py-2 text-gray-300">
                    {cmd.command_type}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <AckIcon ack={cmd.app_ack} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <AckIcon ack={cmd.car_ack} />
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={cmd.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {cmd.created_at
                      ? new Date(cmd.created_at).toLocaleTimeString("zh-CN")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
