# Memory

本文件只記錄長期有效、可復用的規則。
不記錄短期狀態、臨時連結、一次性故障或階段總結。

## 使用者偏好

- 預設使用中文溝通。
- 回答先給結論，再給必要細節。
- 需要可執行結果，不要空泛描述。
- 遇到問題優先直接修復，再解釋原因。

## 命名規範

- 標題、變數與函式名稱優先簡潔、可檢索、語義化；避免無意義縮寫。

## 固定工作流

- 改代碼前先檢查現狀，包括目錄、關鍵文件和運行方式；改後至少做一次基礎校驗。
- 需要下載大型依賴、browser runtime、大型文件或耗時安裝包時，先讓使用者手動下載，再繼續驗證或開發。
- 發現錯誤時：先定位可復現原因，再做最小修復與回歸驗證。
- 收尾時：更新 `Log.md`；只有長期規則才更新 `Memory.md`；專案入口或架構改變才更新 `README.md`。
- 長 session 結束前先做 `memory wrap`；關鍵項目再做一次 cold-load confirm。
- 每次 `memory wrap` 完成後，回覆中必須額外提供一行 `建議標題：<title>`，供使用者改名後再 archive。
- `memory wrap` 的建議標題預設使用中文，可保留必要英文專有名詞；目標長度 8–16 個中文字，最長不超過 20 個中文字，盡量不用標點。
- 建議標題描述本次聊天主要處理的事情方向、種類或最重要成果，不用命令名、workflow 名、下一步描述或泛泛 session 名；若沒有明確成果，改用主線排查或規劃方向。
- 禁止使用 `load project memory`、`memory wrap`、`Memory Wrap Update`、`new chat`、`修一下 chat` 這類標題。
- 全 repo 文字檔預設使用 UTF-8 without BOM；唯一例外是 `README.md`、`Log.md`、`Memory.md`、`*.ps1`，這些固定使用 UTF-8 with BOM。
- `*.ps1` 採 UTF-8 with BOM 是為了 Win11 / Windows PowerShell 5.1 的中文可讀性與相容性，不是因為 PowerShell 語法要求 BOM。
- 在 Windows PowerShell 5.1 下，不用預設 `Get-Content` / `Set-Content` 直接處理 memory 檔與中文敏感檔；讀取優先用 Node 明確以 UTF-8 讀，寫入優先用 `apply_patch` 或可明確控制 UTF-8/BOM 的方式。
- `Memory.md` 變得冗長或混亂時，執行 `Memory prune`，移除過期、重複、模糊或一次性內容。
- GitHub remote 使用 `origin -> https://github.com/dawn1127/dawn_blog.git`；預設上傳流程優先用明確 staged：`git status`、`git add <明確檔案>`、`git add -u`、`git status`、必要時 `git diff --staged --stat` / `git diff --staged`、`git commit -m "..."`、`git push`。
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
