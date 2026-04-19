# Memory

本文件只記錄長期有效、可復用的規則。
不記錄短期狀態、臨時連結、一次性故障或階段總結。

## 使用者偏好

- 預設使用中文溝通。
- 回答先給結論，再給必要細節。
- 需要可執行結果，不要空泛描述。
- 遇到問題優先直接修復，再解釋原因。

## 命名規範

- Markdown 標題使用簡潔、可檢索的命名。
- 變數與函式優先語義化命名，避免無意義縮寫。

## 固定工作流

- 改代碼前：先檢查現狀，包括目錄、關鍵文件和運行方式。
- 改代碼後：至少做一次基礎校驗，包括語法檢查和本地運行驗證。
- 需要下載大型依賴、browser runtime、大型文件或耗時安裝包時，先給使用者明確指令讓使用者手動下載；下載完成後再繼續驗證或開發。
- 部署時：先 Preview，再在使用者明確要求後發 Production。
- 發現錯誤時：先給可復現定位，再給最小修復，再回歸驗證。
- 收尾時：更新 `Log.md`；只有長期規則才更新 `Memory.md`；專案入口或架構改變才更新 `README.md`。
- 長 session 結束前：先做 `memory wrap`；對關鍵項目再做一次「假設沒有聊天記錄」的 cold-load confirm。
- `Memory.md` 變得冗長或混亂時，執行 `Memory prune`，移除過期、重複、模糊或一次性內容。
- 驗證 AI 實際使用的模型時，看 app 記錄/requested model metadata，不依賴模型自我介紹。
- 編輯含中文的 `.ts`、`.tsx`、`.md` 時，避免用 PowerShell 管線重寫檔案；優先用 `apply_patch`，必要時用 Node 明確以 UTF-8 讀寫。

## 網址與導航規則

- 全站 UI 使用「頂部全站導航 + breadcrumb + 板塊內導航」框架。
- 主板塊固定為 Home、Dawn Blog、Network Engineer、以後再開發。
- Network Engineer 內部功能固定為 AI Chat、Network PM Automation、以後再開發。
- AI Chat 是通用工具，但目前正式入口仍放在 `/network-engineer/chat`。
- Chat 正式入口是 `/network-engineer/chat`；不要恢復 `/chat` UI alias。
- Settings 是工具頁，不是產品板塊；只能作為齒輪入口或兼容 redirect 目標。
- Chat sidebar 只負責 conversations、Projects、新對話和 Settings 齒輪，不承擔全站或板塊功能導航。

## 版本策略

- 目前版本節奏屬於 pre-1.0；正式穩定版才使用 `1.0`。
- 目前 app/documentation 顯示版本為 `0.2`，package semver 為 `0.2.0`。
- 一般小步功能更新走 `0.21`、`0.22`；較大階段性改變才到 `0.3`。

## 專案禁忌

- 不覆蓋使用者已有內容。
- 不把密鑰、token、私鑰或敏感憑證寫入專案記憶文件。

## 部署與驗證要求

- 部署到 Production 前必須先經過 Preview。
- 使用者明確確認後，才進行 Production 發佈。
