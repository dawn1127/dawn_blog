# 管理員開啟 / 關閉操作手冊

適用環境：`Win11 + PowerShell + Docker Desktop`

這份手冊只寫管理員日常真正要用的事。  
一般情況下，**不需要 Administrator PowerShell**；先打開 Docker Desktop，確認 Engine 已經是 Running，再用普通 PowerShell 即可。

日常推薦只用 **local 模式**：

- Docker 只跑 `postgres / redis / minio`
- 網站與 worker 用本機 PowerShell 啟動

`local` 和 `compose` **不要同時使用**。如果你已經開了其中一種模式，先停掉，再開另一種。

## 1. 日常只看這 4 條

先進入項目目錄：

```powershell
cd F:\codex\network_engineer_project
```

日常最常用的 4 條：

```powershell
.\scripts\start-local.ps1
.\scripts\status-local.ps1
.\scripts\restart-local.ps1
.\scripts\stop-local.ps1
```

## 7. Production / External Mode Notes

- `.\scripts\start-local.ps1` is for development only and runs `npm run dev`.
- `.\scripts\start-compose.ps1` is the recommended production/external mode and now runs `docker compose up -d --build`.
- Stop local mode before starting compose mode.
- Point Nginx Proxy Manager HTTPS traffic to `http://192.168.1.20:3000`.
- Do not point the public domain at the local dev server.

用途：

- `start-local.ps1`：開網站、worker、基礎 Docker 服務
- `status-local.ps1`：檢查目前是否正常
- `restart-local.ps1`：整套重啟
- `stop-local.ps1`：關閉本機模式

PID 狀態會寫在：

- `.runtime/dev.pid`
- `.runtime/worker.pid`

## 2. Local 模式啟動

這是平日推薦模式，也是最方便排錯的模式。

### 推薦做法

```powershell
cd F:\codex\network_engineer_project
.\scripts\start-local.ps1
```

這支腳本會做：

1. 執行環境檢查
2. 檢查是否已有 compose 的 `web / worker` 在跑
3. 啟動 `postgres / redis / minio`
4. 另外開兩個 PowerShell 視窗來跑：
   - `npm run dev`
   - `npm run worker`
5. 記錄 `.runtime/dev.pid` 和 `.runtime/worker.pid`

啟動後等 10 到 15 秒，再檢查：

```powershell
.\scripts\status-local.ps1
```

正常時你會看到：

- Docker base services = `OK`
- dev process = `OK`
- worker process = `OK`
- `http://localhost:3000/login` = `OK`

主要網址：

- 首頁 / Login：`http://localhost:3000/login`
- Chat：`http://localhost:3000/network-engineer/chat`
- Settings：`http://localhost:3000/settings`

### 手動命令備援

如果你想手動一步一步開：

```powershell
cd F:\codex\network_engineer_project
.\scripts\dev-services.ps1
```

再另外開兩個 PowerShell 視窗：

```powershell
cd F:\codex\network_engineer_project
npm.cmd run dev
```

```powershell
cd F:\codex\network_engineer_project
npm.cmd run worker
```

## 3. Local 模式關閉 / 重啟 / 狀態檢查

### 關閉

推薦：

```powershell
cd F:\codex\network_engineer_project
.\scripts\stop-local.ps1
```

這支腳本會：

1. 先讀 `.runtime/dev.pid`、`.runtime/worker.pid`
2. 停掉對應的 dev / worker 視窗與子進程
3. 如果 PID 檔失效，再用 repo 路徑 + 命令列做 fallback 掃描
4. 停掉 `postgres / redis / minio`

如果你想連 compose 容器也一起做 `down`：

```powershell
.\scripts\stop-local.ps1 -Down
```

### 重啟

```powershell
cd F:\codex\network_engineer_project
.\scripts\restart-local.ps1
```

這等同於：

1. `.\scripts\stop-local.ps1`
2. `.\scripts\start-local.ps1`

### 狀態檢查

```powershell
cd F:\codex\network_engineer_project
.\scripts\status-local.ps1
```

這支腳本會檢查：

- Docker base services
- web dev process
- worker process
- `http://localhost:3000/login`

輸出只有三種狀態：

- `OK`
- `WARNING`
- `FAIL`

常見情況：

- `WARNING dev process`：PID 檔失效，但掃描到實際進程還在跑  
  代表網站可能還活著，但 PID 追蹤不同步。建議跑一次：

  ```powershell
  .\scripts\restart-local.ps1
  ```

- `FAIL Login URL`：網站沒有正常回應  
  先看 `npm run dev` 視窗有沒有報錯，再決定是否重啟。

## 4. 備用 Compose 模式

只有在你想整套一鍵全開 / 全停時，才用 compose 模式。

### 啟動

```powershell
cd F:\codex\network_engineer_project
.\scripts\start-compose.ps1
```

這會先檢查 local 模式的 dev / worker 是否仍在跑；如果 local 模式還在跑，腳本會直接報錯退出，不會自動幫你停掉。

### 關閉

```powershell
cd F:\codex\network_engineer_project
.\scripts\stop-compose.ps1
```

如果要 `down`：

```powershell
.\scripts\stop-compose.ps1 -Down
```

### 手動命令備援

```powershell
cd F:\codex\network_engineer_project
docker compose up -d
docker compose stop
docker compose down
```

提醒：compose 模式已經包含 `web` 和 `worker`，所以 **不要再另外跑 `npm run dev` / `npm run worker`**。

## 5. 第一次初始化

新機器第一次開，先用：

```powershell
cd F:\codex\network_engineer_project
.\scripts\first-run.ps1
```

這支腳本會做：

- 建立 `.env`（如果還沒有）
- `npm install`
- `npm run prisma:generate`
- 啟動 `postgres / redis / minio`
- `npm run prisma:deploy`
- `npm run prisma:seed`

完成後，日常就改用：

```powershell
.\scripts\start-local.ps1
```

## 6. 常見問題

### 一般情況需要 Administrator PowerShell 嗎？

不用。  
預設用普通 PowerShell 就可以。只有在你本機權限策略、公司管控、或 Docker 權限異常時，才改用 Administrator PowerShell。

### 一開腳本就說 Docker Desktop not ready

代表 Docker Desktop 還沒完全起來。  
先打開 Docker Desktop，等 Engine 顯示 Running，再重試。

### `start-local.ps1` 說 compose mode 正在跑

代表 `network-ai-web` 或 `network-ai-worker` 還在容器內運行。  
先跑：

```powershell
.\scripts\stop-compose.ps1
```

再改開：

```powershell
.\scripts\start-local.ps1
```

### `start-compose.ps1` 說 local mode 正在跑

代表本機 `npm run dev` / `npm run worker` 還在跑。  
先跑：

```powershell
.\scripts\stop-local.ps1
```

再開 compose 模式。

### 我只想看現在活著沒有

先跑：

```powershell
.\scripts\status-local.ps1
```

再用瀏覽器打開：

```text
http://localhost:3000/login
```

### 現有輔助腳本各自做什麼？

- `.\scripts\check-env.ps1`：檢查 `node / npm / docker / .env`
- `.\scripts\dev-services.ps1`：只負責起 `postgres / redis / minio`
- `.\scripts\first-run.ps1`：第一次初始化
- `.\scripts\verify-app.ps1`：跑 `typecheck / lint / build / audit`

如果你在 PowerShell 直接手動跑 npm 指令，而又遇到 `npm.ps1` 被策略擋住，改用：

```powershell
npm.cmd run dev
npm.cmd run worker
```

日常不要記太多，記住這四條就夠：

```powershell
.\scripts\start-local.ps1
.\scripts\status-local.ps1
.\scripts\restart-local.ps1
.\scripts\stop-local.ps1
```
