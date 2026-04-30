# Log

Newest entry first. Keep short-term progress here. Do not store durable rules.

## 2026-05-01 - Dossier Skill Schema 拆分與 Slim 重構

### Done

- 完成 `obsidian-bug-triage` skill 的激進 5 件式重構（A+B+C+D+E），目標：multi-vault 共用同一方法、token 經濟最大化、reflexive 更新硬保證。
- **A. Schema 拆分**：新增 `~/.claude/skills/obsidian-bug-triage/references/schema-core.md`（160 行，16 章 vault-agnostic）；vault `CLAUDE.md` 從 148 行縮到 35 行（vault identity + §3/§16 deltas + override slot）。新 vault 只要 30 行 local 即可上手。
- **B. Reflexive 強制（atomic）**：schema-core §11 新規則「`dossier note` / `dossier symptom` 必須 atomic 含 `index.md` / `triage.md` / 相關 module 的反向更新」；新增 `partially-applied` buffer 狀態，防止 incident/symptom 寫入後 index/triage 漂移破壞 token 經濟。
- **C. SKILL.md slim**：508 → 91 行（-82%）。詳細語意搬到 `references/method-details.md`（232 行）和 `references/gate-modes.md`（102 行）。
- **D. Schema 版本欄位**：SKILL `schema-version-pinned` / schema-core 標頭 / vault `CLAUDE.md` pin 三處對齊到 `2026-05-01`；mismatch 時 skill 警告不寫。
- **E. Skill 路徑配置化**：新增 `references/registered-vaults.md`（44 行）作為 repo→vault 映射表；新 vault 只需加一行即接上，不用複製改寫整個 SKILL。
- **Gate 輸出輕量化**：no-op（最常見）改 1 行；verbose 8 行模板只在 `possible-gap` / `blocked-gap` 才用。
- **Vault `log.md` 補 `[2026-05-01] schema-bump` entry**；action 集合從 5 種擴成 6 種（+`schema-bump`）。
- **空跑驗證**：本輪 wrap 前用新 SKILL 流程跑一次 `dossier check` — active vault detection 通過、schema-version match、gate 輸出 no-op 單行、buffer reminder level=none，無破口。
- **不動的承重結構**（保留）：repo-first 驗證順序、三層邊界、`Module Profile + Debug Dossier` 模板、symptom 2 次門檻、incident 4 項門檻、buffer 雙軌分工 — 全在 schema-core 裡完整保留。

### Files Changed

- `~/.claude/skills/obsidian-bug-triage/SKILL.md`：508 → 91 行
- `~/.claude/skills/obsidian-bug-triage/references/schema-core.md`：新檔，160 行
- `~/.claude/skills/obsidian-bug-triage/references/registered-vaults.md`：新檔，44 行
- `~/.claude/skills/obsidian-bug-triage/references/gate-modes.md`：新檔，102 行
- `~/.claude/skills/obsidian-bug-triage/references/method-details.md`：新檔，232 行
- `F:\Obsidian\network_engineer_vault\CLAUDE.md`：148 → 35 行
- `F:\Obsidian\network_engineer_vault\log.md`：擴充 action 集合 + schema-bump entry
- `*.pre-2026-05-01` 兩份備份保留
- 上述全部在 repo 外（`~/.claude/skills/` + `F:\Obsidian\`），不入 git；本 wrap 僅 commit `Log.md`

### Validation

- 三處 `schema-version` grep 確認都是 `2026-05-01`
- Active vault detection chain：registered-vaults → vault CLAUDE.md pin → skill schema-version-pinned → 全部 match
- `available skills` system-reminder 確認 SKILL.md 新 description 已熱載入
- `dossier check` 空跑 gate 輸出 no-op 單行，無破口
- Log.md auto-rotate：本 wrap 寫完總數 5 > 4，按 Memory.md 規則 trim 到 3（保留 2026-05-01 / 2026-04-30 / 2026-04-26；2026-04-25 與 2026-04-20 進 git 歷史）

### Blockers

- 無 blocker。
- Open items（deferred）：
  - codex side `~/.codex/skills/obsidian-bug-triage/` 仍是 500+ 行老版本；需 codex 自行做同樣 5 檔重構並對齊 schema-version 2026-05-01（已記在 vault `log.md`）
  - 5 個 Claude Code-side Notion managed pages（Triage / Memory / Notion Workflow / Portal Layout Guides + sub-portal）尚未反映 schema split + atomic reflexive 規則；下次 portal sync 再處理
  - `note-map.md`（394 行）目前單一 vault file-to-note mapping，多 vault 後應改 per-vault section；deferred 等真開第二個 vault 再動

### Next

- （可選）試水 `dawn_blog_vault` 或新 vault skeleton，驗證 multi-vault portability schema 是否真複製得起來
- 同步 codex side 5 檔重構
- 同步 5 個 Notion managed pages
- 回到產品線：定義 `Network PM Automation` 第一個實際能力

## 2026-04-30 - 新號 Claude Code 接手 + Skill 全域化 + Notion 同步

### Done

- 新號 Claude Code 接手舊號專案上下文。舊號 user prompt 提供 5-step handoff；本輪走完 Step 0–5 並完成 cold-load self-test（6 題答案完整輸出，待舊號批改）。
- 兩號共用 `~/.claude/`，但 Anthropic 帳號獨立；Notion connector 是 OAuth-based，新號需單獨重新授權。
- **Phase 1**：補裝 3 個缺失 skill 到 `~/.claude/skills/`（global，避免 worktree 切換丟失）。從 `~/.codex/skills/` 複製，同步補上舊號之前在已消失 worktree 中清過、但 codex 端未同步的 8 處 bug：
  - `notion-portal-layout/SKILL.md`：5 處 dead refs（4× `notion:notion-knowledge-capture`、1× `notion:notion-research-documentation`）→ 改寫為 `$notion-workflow-automation`
  - `notion-workflow-automation/SKILL.md`：vault path `Network Engineer AI Platform\10-notion-write-buffer.md` → `network_engineer_vault\buffers\notion-write.md`；1 處 dead ref；2 處 buffer filename
  - `notion-workflow-automation/references/buffer-format.md`：vault path 同上修正；agent 描述 Codex-facing → shared by Claude Code and Codex
  - `notion-workflow-automation/references/page-registry.md`：vault path + 3 處 buffer filename
  - `obsidian-bug-triage`：原樣複製，已是 agent-neutral，無需修補
- **Phase 2**：`Memory.md` 工作流硬規則對齊實際 vault：`00-home.md` → `index.md`、`01-triage-map.md` → `triage.md`。BOM `efbb bf` 保留。
- **Phase 3**：Notion connector 重新 OAuth（修復 claude.ai 帳號 mismatch 後）；14 個 `mcp__744ad713-...__notion-*` tool 可用；fetch managed page `348a627c-...` 驗證讀取成功。
- **Phase 4–5**：5 個 Claude Code-side managed pages 走完 portal gate + layout preflight + page-sync executed + fetch verify：
  - `34da627c-4832-81a4-...` Claude Code sub-portal（2 輪 / 7 patches）
  - `34da627c-4832-8180-...` Triage Skill Guide（2 輪 / 7 patches；含 11-note 列表整段重寫為新階層化結構）
  - `34da627c-4832-81de-...` Notion Workflow Guide（3 patches）
  - `34da627c-4832-8111-...` Portal Layout Guide（2 patches）
  - `34da627c-4832-81f3-...` Memory Skill Guide → verified no-op（內容仍正確）
  - `34ea627c-4832-8182-...` ui-ux-pro-max Guide → verified no-op（skill 未變）
- 對齊到的關鍵變更：skill 位置 project-scope→global、vault 結構 11 個 NN-*.md → `index/triage/handover/modules/incidents/symptoms/buffers/templates`、setup status 寫入 2026-04-26 cooperation rules 與 2026-04-30 帳號接手紀錄。

### Files Changed

- `Memory.md`（1 行 edit；BOM 保留）
- `~/.claude/skills/obsidian-bug-triage/`（新裝，原樣複製）
- `~/.claude/skills/notion-workflow-automation/`（新裝 + 4 處 path/buffer 修補）
- `~/.claude/skills/notion-portal-layout/`（新裝 + 5 處 dead refs 清理）
- Notion managed pages：5 page-sync executed + 1 verified no-op，共 19 處 `content_updates` patches

### Validation

- `available skills` system-reminder 確認三個新 skill 已熱載入並出現在列表中
- `git diff Memory.md` 顯示僅預期 1 行變更；`xxd` 確認 BOM `efbb bf` 完好
- 5 頁 Notion 各自 update 後跑一次 `notion-fetch` 驗證內容正確
- Cold-load self-test 6/6 答案輸出（Q1 版本、Q2 chat 入口、Q3 2026-04-26 wrap、Q4 Notion gate、Q5 PowerShell 中文編碼、Q6 agent 分工），等舊號批改

### Blockers

- 無 blocker。
- Open items（deferred）：
  - codex 端適配（2026-04-26 約定的 3 項：shared root Log.md 3-entry rule、`obsidian-bug-triage/references/buffer-format.md` agent 前綴、`notion-workflow-automation/references/buffer-format.md` agent 前綴）尚未確認 codex 是否已執行
  - codex 的 `obsidian-bug-triage/references/note-map.md` 尚未針對新 vault 結構同步（Claude side `~/.claude/skills/` 也是同一個過時版本）
  - README.md 尚未補「新 Claude Code 帳號接手 cookbook」（避免下次新號再丟）

### Next

- 在 README.md 新增「新 Claude Code 帳號接手 cookbook」section（含 Phase 1–3 步驟）
- 確認 codex 端已落地 2026-04-26 約定 3 項
- 同步 `note-map.md` 到新 vault 結構（兩端 skill 都需更新）
- 回到產品線：定義 `Network PM Automation` 第一個實際能力

## 2026-04-26 - Cooperation Rules Locked And memory-bound-log Merged To Main

### Done

- Inter-agent chat-room established at `claude and codex chat room/` (rounds 01-04). Per user role-reset 2026-04-26: Claude Code is lead agent; codex is support agent.
- Cooperation rules locked in `Memory.md`:
  - "End-of-response self-check" rule marked `(Claude Code only)`
  - Added "Wrap canonical" — Claude Code is default canonical wrapper for shared root `Log.md`; codex defers unless delegated
  - Added "Buffer ID prefix" — `dossier-action-{agent}-YYYYMMDD-NNN` / `notion-buffer-{agent}-YYYYMMDD-NNN`; existing entries migrate at next prune
- Merged `memory-bound-log` to `main` via fast-forward push (`be85d6c..33405d3 -> main`). 4 commits absorbed: cf28434, ab4fe47, 18bd53b, 33405d3.
- First real auto-rotate test: this wrap brings Log.md to 5 entries → auto-trim to 3 per Memory.md rule. Older entries preserved in git history and tag `pre-log-rotate-2026-04-25`.

### Files Changed

- `Memory.md` (3 lines added: Wrap canonical, Buffer ID prefix, `(Claude Code only)` marker)
- `Log.md` (this entry + auto-rotate trim of 2 oldest entries)
- chat-room files `01-04-...md` (untracked at main repo, inter-agent coordination only)
- `origin/main` advanced from `be85d6c` to `33405d3`

### Validation

- Pre-merge `git rev-list --left-right --count origin/main...HEAD` = `0  4` (clean fast-forward, no conflict)
- Push result: `be85d6c..33405d3 memory-bound-log -> main` (no rejection)
- Tag `pre-log-rotate-2026-04-25` on origin (1746-line pre-rotate Log.md backup intact)
- Auto-rotate result: Log.md trimmed from 5 to 3 entries; BOM preserved at offset 0

### Blockers

- No blocker.
- Codex-side adaptations pending (Section 9 of `03-claude-code-cooperation-plan-2026-04-26.md`):
  - codex switches `Memory wrap` behavior from latest-only to 3-entry rule on shared root `Log.md`
  - codex updates local `obsidian-bug-triage/references/buffer-format.md` for agent-prefixed action IDs
  - codex updates local `notion-workflow-automation/references/buffer-format.md` for agent-prefixed buffer IDs

### Next

- Observe soft-rule adherence over 1-2 weeks; if reliability < 90% consider PreToolUse hook layer
- Threshold escalation per codex 10.4: extract to `AGENTS.md` if `Memory.md` > 200 lines OR coop rules > 25 bullets
- Threshold escalation per codex 10.3: build shared canonical at `docs/agent-coordination/page-registry.shared.md` if title drift > 2 incidents/month
- Resume product-level work: define first capability inside `Network PM Automation`

