"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import type { AlarmEvent } from "../shared/protocol";

interface AlarmBannerProps {
  alarms: AlarmEvent[];
}

export default function AlarmBanner({ alarms }: AlarmBannerProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const criticalAlarms = alarms.filter(
    (alarm, idx) => alarm.level === "critical" && !dismissed.has(idx)
  );

  if (criticalAlarms.length === 0) return null;

  const latestAlarm = criticalAlarms[0];

  return (
    <div className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 flex items-center justify-between animate-pulse">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <div>
          <span className="text-red-300 font-medium text-sm">
            严重报警
          </span>
          <span className="text-red-400 text-sm ml-2">
            [{latestAlarm.code}] {latestAlarm.msg}
          </span>
          {criticalAlarms.length > 1 && (
            <span className="text-red-500 text-xs ml-2">
              (还有 {criticalAlarms.length - 1} 条)
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => {
          const idx = alarms.indexOf(latestAlarm);
          setDismissed((prev) => new Set([...prev, idx]));
        }}
        className="text-red-400 hover:text-red-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
