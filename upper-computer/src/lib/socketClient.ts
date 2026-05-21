"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type {
  TelemetryFrame,
  BridgeState,
  AlarmEvent,
  OrderData,
  Command,
} from "../shared/protocol";

interface WebUser {
  id?: number;
  worker_no?: string;
  name?: string;
  role?: string;
}

const WEB_TOKEN_KEY = "upper_computer_web_token";
const ACK_TIMEOUT_MS = 6000;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isWebAuthenticated, setIsWebAuthenticated] = useState(false);
  const [webUser, setWebUser] = useState<WebUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [appOnline, setAppOnline] = useState(false);
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryFrame | null>(null);
  const [recentAlarms, setRecentAlarms] = useState<AlarmEvent[]>([]);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderData | null>(null);
  const [lastCommandUpdate, setLastCommandUpdate] = useState<unknown | null>(null);

  const joinWithToken = useCallback((socket: Socket, token: string | null) => {
    if (!token) {
      setIsWebAuthenticated(false);
      setWebUser(null);
      return;
    }

    socket.emit("web:join", { token }, (response: { ok?: boolean; user?: WebUser; msg?: string }) => {
      if (response?.ok) {
        setIsWebAuthenticated(true);
        setWebUser(response.user || null);
        setAuthError("");
      } else {
        localStorage.removeItem(WEB_TOKEN_KEY);
        setIsWebAuthenticated(false);
        setWebUser(null);
        setAuthError(response?.msg || "请登录上位机管理端");
      }
    });
  }, []);

  useEffect(() => {
    const socket = io({
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      const token = typeof window !== "undefined" ? localStorage.getItem(WEB_TOKEN_KEY) : null;
      joinWithToken(socket, token);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("server:web_auth_required", (data: { msg?: string }) => {
      setIsWebAuthenticated(false);
      setWebUser(null);
      setAuthError(data?.msg || "请登录上位机管理端");
    });

    socket.on("server:app_status", (data: { online: boolean }) => {
      setAppOnline(data.online);
    });

    socket.on("server:app_online", () => {
      setAppOnline(true);
    });

    socket.on("server:app_offline", () => {
      setAppOnline(false);
    });

    socket.on("server:bridge_state", (data: BridgeState) => {
      setBridgeState(data);
    });

    socket.on("server:telemetry", (data: TelemetryFrame) => {
      setTelemetry(data);
    });

    socket.on("server:alarm", (data: AlarmEvent) => {
      setRecentAlarms((prev) => [data, ...prev].slice(0, 50));
    });

    socket.on("server:order_updated", (data: OrderData) => {
      setLastOrderUpdate(data);
    });

    socket.on("server:command_updated", (data: unknown) => {
      setLastCommandUpdate(data);
    });

    socket.on("server:command_created", (data: Command) => {
      setLastCommandUpdate(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [joinWithToken]);

  const login = useCallback((workerNo: string, password: string): Promise<{ ok: boolean; msg?: string }> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) {
        resolve({ ok: false, msg: "Socket 未连接" });
        return;
      }

      socket.emit(
        "web:login",
        { worker_no: workerNo, password },
        (response: { ok?: boolean; token?: string; worker?: WebUser; msg?: string; message?: string }) => {
          if (response?.ok && response.token) {
            localStorage.setItem(WEB_TOKEN_KEY, response.token);
            setIsWebAuthenticated(true);
            setWebUser(response.worker || null);
            setAuthError("");
            resolve({ ok: true });
          } else {
            const msg = response?.msg || response?.message || "登录失败";
            setAuthError(msg);
            resolve({ ok: false, msg });
          }
        }
      );
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(WEB_TOKEN_KEY);
    setIsWebAuthenticated(false);
    setWebUser(null);
    socketRef.current?.emit("web:logout");
  }, []);

  const emit = useCallback(
    (event: string, ...args: unknown[]) => {
      if (event.startsWith("web:") && !["web:login", "web:join", "web:logout"].includes(event) && !isWebAuthenticated) {
        setAuthError("请先登录上位机管理端");
        return;
      }
      socketRef.current?.emit(event, ...args);
    },
    [isWebAuthenticated]
  );

  const emitWithAck = useCallback(
    <T = unknown>(event: string, ...args: unknown[]): Promise<T> => {
      return new Promise((resolve, reject) => {
        if (event.startsWith("web:") && !["web:login", "web:join", "web:logout"].includes(event) && !isWebAuthenticated) {
          reject(new Error("Web 管理端未认证"));
          return;
        }

        const socket = socketRef.current;
        if (!socket) {
          reject(new Error("Socket 未连接"));
          return;
        }

        const timer = setTimeout(() => reject(new Error(`${event} ACK 超时`)), ACK_TIMEOUT_MS);
        socket.emit(event, ...args, (response: T) => {
          clearTimeout(timer);
          resolve(response);
        });
      });
    },
    [isWebAuthenticated]
  );

  return {
    socket: socketRef.current,
    isConnected,
    isWebAuthenticated,
    webUser,
    authError,
    login,
    logout,
    appOnline,
    bridgeState,
    telemetry,
    recentAlarms,
    lastOrderUpdate,
    lastCommandUpdate,
    emit,
    emitWithAck,
  };
}
