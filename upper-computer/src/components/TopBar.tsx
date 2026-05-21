"use client";

import { useState, useEffect } from "react";
import { Bell, Wifi, WifiOff, Clock, LogOut, User } from "lucide-react";

interface TopBarProps {
  isConnected: boolean;
  appOnline: boolean;
  alarmCount: number;
  userName?: string;
  onLogout?: () => void;
}

export default function TopBar({
  isConnected,
  appOnline,
  alarmCount,
  userName,
  onLogout,
}: TopBarProps) {
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-[240px] right-0 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-gray-300">
          电气盘柜吊装转运系统
        </h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Clock className="w-4 h-4" />
          <span className="font-mono">{currentTime}</span>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-1.5 text-xs ${
              isConnected ? "text-green-400" : "text-red-400"
            }`}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>WS</span>
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs ${
              appOnline ? "text-green-400" : "text-gray-500"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                appOnline ? "bg-green-500 animate-pulse" : "bg-gray-600"
              }`}
            />
            <span>APP</span>
          </div>
        </div>

        <div className="relative">
          <Bell
            className={`w-5 h-5 ${
              alarmCount > 0 ? "text-red-400" : "text-gray-500"
            }`}
          />
          {alarmCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {alarmCount > 9 ? "9+" : alarmCount}
            </span>
          )}
        </div>

        {userName && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User className="w-4 h-4" />
            <span>{userName}</span>
            <button
              type="button"
              className="p-1 rounded hover:bg-gray-800 hover:text-gray-200"
              onClick={onLogout}
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
