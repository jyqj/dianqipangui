"use client";

import { createContext, useContext } from "react";
import type { BridgeState, TelemetryFrame, AlarmEvent, OrderData } from "../shared/protocol";

export interface WebUser {
  id?: number;
  worker_no?: string;
  name?: string;
  role?: string;
}

export interface SocketContextValue {
  isConnected: boolean;
  isWebAuthenticated: boolean;
  webUser: WebUser | null;
  authError: string;
  login: (workerNo: string, password: string) => Promise<{ ok: boolean; msg?: string }>;
  logout: () => void;
  appOnline: boolean;
  bridgeState: BridgeState | null;
  telemetry: TelemetryFrame | null;
  recentAlarms: AlarmEvent[];
  lastOrderUpdate: OrderData | null;
  lastCommandUpdate: unknown | null;
  emit: (event: string, ...args: unknown[]) => void;
  emitWithAck: <T = unknown>(event: string, ...args: unknown[]) => Promise<T>;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocketContext must be used within SocketContext.Provider");
  }
  return ctx;
}
