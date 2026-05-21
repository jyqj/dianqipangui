"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Monitor,
  Users,
  AlertTriangle,
  BarChart3,
  Settings,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/orders", label: "工单管理", icon: ClipboardList },
  { href: "/monitor", label: "实时监控", icon: Monitor },
  { href: "/workers", label: "人员管理", icon: Users },
  { href: "/alarms", label: "报警日志", icon: AlertTriangle },
  { href: "/history", label: "历史统计", icon: BarChart3 },
  { href: "/settings", label: "系统设置", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-gray-900 border-r border-gray-800 flex flex-col z-40">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2 px-4 border-b border-gray-800">
        <Zap className="w-6 h-6 text-blue-500" />
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">
            电气盘柜吊装系统
          </h1>
          <p className="text-[10px] text-gray-500">上位机管理平台</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <p className="text-xs text-gray-600 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
