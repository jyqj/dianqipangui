import http from "http";
import next from "next";
import { Server } from "socket.io";
import { initSocket } from "./src/server/socket";
import { initDatabase } from "./src/server/db";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });

const allowedOriginPatterns = (process.env.SOCKET_CORS_ORIGIN || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (allowedOriginPatterns.length > 0) {
    return allowedOriginPatterns.some((pattern) => origin === pattern);
  }
  return (
    /^http:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin) ||
    /^http:\/\/192\.168\.\d+\.\d+(?::\d+)?$/.test(origin) ||
    /^http:\/\/10\.\d+\.\d+\.\d+(?::\d+)?$/.test(origin)
  );
}
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = http.createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS blocked: ${origin}`));
        }
      },
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // 初始化数据库
  initDatabase();

  // 初始化 Socket.IO 事件
  initSocket(io);

  httpServer.listen(port, () => {
    console.log(`\n====================================`);
    console.log(`  电气盘柜吊装转运系统 - 上位机`);
    console.log(`  运行模式: ${dev ? "开发" : "生产"}`);
    console.log(`  访问地址: http://localhost:${port}`);
    console.log(`====================================\n`);
  });
});
