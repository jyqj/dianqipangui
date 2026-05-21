"use client";

import "./globals.css";
import { useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import AlarmBanner from "../components/AlarmBanner";
import { useSocket } from "../lib/socketClient";
import { SocketContext } from "../lib/socketContext";

function LoginOverlay({
  isConnected,
  authError,
  onLogin,
}: {
  isConnected: boolean;
  authError: string;
  onLogin: (workerNo: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
}) {
  const [workerNo, setWorkerNo] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError("");
    if (!workerNo.trim() || !password) {
      setLocalError("请输入管理员工号和密码");
      return;
    }
    setLoading(true);
    const result = await onLogin(workerNo.trim(), password);
    setLoading(false);
    if (!result.ok) setLocalError(result.msg || "登录失败");
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-sm card p-6 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-white">上位机管理端登录</h1>
          <p className="text-xs text-gray-500 mt-1">
            需要管理员账号后才能访问工单、人员与控制指令。
          </p>
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs text-gray-400">管理员工号</span>
            <input className="input mt-1" value={workerNo} onChange={(e) => setWorkerNo(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400">密码</span>
            <input
              className="input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </label>
        </div>
        {(localError || authError) && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {localError || authError}
          </div>
        )}
        <button className="btn-primary w-full" disabled={loading || !isConnected} type="submit">
          {!isConnected ? "连接服务器中..." : loading ? "登录中..." : "登录"}
        </button>
        <p className="text-[11px] text-gray-600">
          首次运行默认管理员来自服务端初始化；现场环境请通过 DEFAULT_ADMIN_PASSWORD 修改默认密码。
        </p>
      </form>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const socketState = useSocket();

  return (
    <html lang="zh-CN">
      <head>
        <title>电气盘柜吊装转运系统 - 上位机</title>
        <meta name="description" content="电气盘柜吊装转运系统上位机管理界面" />
      </head>
      <body>
        <SocketContext.Provider value={socketState}>
          {!socketState.isWebAuthenticated && (
            <LoginOverlay
              isConnected={socketState.isConnected}
              authError={socketState.authError}
              onLogin={socketState.login}
            />
          )}
          <Sidebar />
          <TopBar
            isConnected={socketState.isConnected}
            appOnline={socketState.appOnline}
            alarmCount={
              socketState.recentAlarms.filter((a) => a.level === "critical")
                .length
            }
            userName={socketState.webUser?.name}
            onLogout={socketState.logout}
          />
          <main className="ml-[240px] mt-14 p-6 min-h-[calc(100vh-56px)]">
            <AlarmBanner alarms={socketState.recentAlarms} />
            <div className="mt-2">{children}</div>
          </main>
        </SocketContext.Provider>
      </body>
    </html>
  );
}
