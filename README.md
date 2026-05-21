# 电气盘柜吊装转运系统

包含两个软件部分：

- `upper-computer/`：上位机 Web 管理系统，Next.js + Socket.IO + SQLite。
- `car-controller-app/`：手机 App，uni-app + Pinia + Socket.IO Client，内置 FakeCar 模拟小车，预留 BLE 接入。

主要文档见 `docs/README.md`。

## 快速启动

### 上位机

```bash
cd upper-computer
npm install
npm run dev
```

默认访问：`http://localhost:3000`。

生产/现场环境建议配置：

```bash
JWT_SECRET=强随机密钥
DEFAULT_ADMIN_PASSWORD=强密码
SOCKET_CORS_ORIGIN=http://上位机IP:3000
```

### App H5 预览

```bash
cd car-controller-app
npm install
npm run dev:h5
```

### 验证

```bash
cd upper-computer
npx tsc -p tsconfig.server.json --noEmit
npm run build

cd ../car-controller-app
npm run check:js
npm run build:h5
```
