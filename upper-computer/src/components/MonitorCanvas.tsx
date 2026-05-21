"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TelemetryFrame } from "../shared/protocol";

interface MonitorCanvasProps {
  telemetry: TelemetryFrame | null;
  targetX?: number;
  targetY?: number;
}

interface TrajectoryPoint {
  x: number;
  y: number;
  ts: number;
}

// 坐标系参数
const GRID_SIZE = 50; // 网格间距（像素）
const WORLD_SCALE = 50; // 1m = 50px
const WORLD_ORIGIN_X = 400; // 世界原点在 canvas 上的 x
const WORLD_ORIGIN_Y = 300; // 世界原点在 canvas 上的 y

function worldToCanvas(wx: number, wy: number): [number, number] {
  return [
    WORLD_ORIGIN_X + wx * WORLD_SCALE,
    WORLD_ORIGIN_Y - wy * WORLD_SCALE, // y轴翻转
  ];
}

export default function MonitorCanvas({
  telemetry,
  targetX,
  targetY,
}: MonitorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const trajectoryRef = useRef<TrajectoryPoint[]>([]);
  const animFrameRef = useRef<number>(0);

  // 记录轨迹
  useEffect(() => {
    if (telemetry) {
      const trajectory = trajectoryRef.current;
      const last = trajectory[trajectory.length - 1];
      // 只在位置变化时记录
      if (
        !last ||
        Math.abs(last.x - telemetry.estimated_x) > 0.01 ||
        Math.abs(last.y - telemetry.estimated_y) > 0.01
      ) {
        trajectory.push({
          x: telemetry.estimated_x,
          y: telemetry.estimated_y,
          ts: telemetry.ts,
        });
        // 最多保留500个点
        if (trajectory.length > 500) {
          trajectory.splice(0, trajectory.length - 500);
        }
      }
    }
  }, [telemetry]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 适配容器大小
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // 清空背景
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    // 绘制网格
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 绘制坐标轴
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    // X轴
    ctx.beginPath();
    ctx.moveTo(0, WORLD_ORIGIN_Y);
    ctx.lineTo(width, WORLD_ORIGIN_Y);
    ctx.stroke();
    // Y轴
    ctx.beginPath();
    ctx.moveTo(WORLD_ORIGIN_X, 0);
    ctx.lineTo(WORLD_ORIGIN_X, height);
    ctx.stroke();

    // 坐标刻度
    ctx.fillStyle = "#475569";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    for (let i = -8; i <= 8; i++) {
      if (i === 0) continue;
      const sx = WORLD_ORIGIN_X + i * WORLD_SCALE;
      if (sx > 0 && sx < width) {
        ctx.fillText(`${i}`, sx, WORLD_ORIGIN_Y + 14);
      }
      const sy = WORLD_ORIGIN_Y - i * WORLD_SCALE;
      if (sy > 0 && sy < height) {
        ctx.textAlign = "right";
        ctx.fillText(`${i}`, WORLD_ORIGIN_X - 6, sy + 4);
        ctx.textAlign = "center";
      }
    }

    // 原点标记
    ctx.fillStyle = "#64748b";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("O", WORLD_ORIGIN_X + 4, WORLD_ORIGIN_Y + 14);

    // 绘制目标点
    if (targetX != null && targetY != null) {
      const [tx, ty] = worldToCanvas(targetX, targetY);
      ctx.save();
      // 目标圆环
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx, ty, 12, 0, Math.PI * 2);
      ctx.stroke();
      // 十字准心
      ctx.beginPath();
      ctx.moveTo(tx - 16, ty);
      ctx.lineTo(tx + 16, ty);
      ctx.moveTo(tx, ty - 16);
      ctx.lineTo(tx, ty + 16);
      ctx.stroke();
      // 标签
      ctx.fillStyle = "#22c55e";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        `目标 (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`,
        tx + 18,
        ty - 4
      );
      ctx.restore();
    }

    // 绘制轨迹
    const trajectory = trajectoryRef.current;
    if (trajectory.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#3b82f680";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.beginPath();
      const [sx, sy] = worldToCanvas(trajectory[0].x, trajectory[0].y);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < trajectory.length; i++) {
        const [px, py] = worldToCanvas(trajectory[i].x, trajectory[i].y);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 绘制小车
    if (telemetry) {
      const [cx, cy] = worldToCanvas(
        telemetry.estimated_x,
        telemetry.estimated_y
      );

      ctx.save();
      ctx.translate(cx, cy);

      // 小车外圈光晕
      const gradient = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
      gradient.addColorStop(0, "#3b82f640");
      gradient.addColorStop(1, "#3b82f600");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.fill();

      // 小车三角形
      ctx.fillStyle = "#3b82f6";
      ctx.strokeStyle = "#60a5fa";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(-10, 10);
      ctx.lineTo(10, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 中心点
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 坐标标签
      ctx.fillStyle = "#93c5fd";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(
        `(${telemetry.estimated_x.toFixed(2)}, ${telemetry.estimated_y.toFixed(2)})`,
        cx + 16,
        cy + 20
      );

      // 进度条（如果在执行）
      if (telemetry.progress_pct > 0 && telemetry.progress_pct < 100) {
        const barWidth = 60;
        const barHeight = 4;
        const barX = cx - barWidth / 2;
        const barY = cy + 28;

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = "#3b82f6";
        ctx.fillRect(
          barX,
          barY,
          (barWidth * telemetry.progress_pct) / 100,
          barHeight
        );

        ctx.fillStyle = "#94a3b8";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${telemetry.progress_pct}%`, cx, barY + 14);
      }
    }

    // 左上角图例
    ctx.save();
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(10, 10, 140, 60);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, 140, 60);

    ctx.font = "10px sans-serif";
    ctx.textAlign = "left";

    // 小车图例
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.moveTo(26, 26);
    ctx.lineTo(20, 36);
    ctx.lineTo(32, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("当前小车位置", 40, 34);

    // 目标图例
    ctx.strokeStyle = "#22c55e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(26, 52, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("目标位置", 40, 56);

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(draw);
  }, [telemetry, targetX, targetY]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="w-full h-full bg-[#0a0a0f] rounded-lg overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
