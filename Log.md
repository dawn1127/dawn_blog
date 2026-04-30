# Log

Newest entry first. Keep short-term progress here. Do not store durable rules.

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

## 2026-04-25 - Claude Code Skill Setup And Memory Workflow Bound Log

### Done

- Installed 4 cooperative skills for Claude Code, mirroring codex's three-layer automation:
  - `project-memory-workflow` at `~/.claude/skills/` (global scope)
  - `obsidian-bug-triage`, `notion-workflow-automation`, `notion-portal-layout` at `<worktree>/.claude/skills/` (project scope, ignored via `.git/info/exclude`)
- Set up `CLAUDE.md` at worktree root with `@Memory.md` / `@README.md` / `@Log.md` auto-imports so new Claude Code sessions auto-load project context without `Memory load`.
- Added Memory.md hard rules under `## 工作流強制規則 (auto-invoke skill)`:
  - Notion MCP write requires Auto Notion portal gate + layout preflight first
  - Website bug/debug triage routes through Obsidian dossier (00-home -> 01-triage-map -> module note) before repo
  - `Memory wrap` / commit / push / publish trigger auto Notion gate + auto dossier gate
  - Escape hatch when user explicitly requests skip
  - End-of-response self-check after Edit/Write/Bash(git commit/push/tag)
- Cleaned 5 dead references to `notion:notion-knowledge-capture` and `notion:notion-research-documentation` in `notion-portal-layout/SKILL.md`; routed those paths back to `$notion-workflow-automation`.
- Added `## Automatic trigger scope` section to `notion-portal-layout/SKILL.md` so it explicitly auto-invokes before any Notion MCP write; demoted `layout check` public method to optional debug.
- Synced `notion-workflow-automation/references/page-registry.md` portal title from `Codex` to `Codex and Claude Code` (Notion-side title was renamed manually by user).
- Switched memory model: dropped `Log-latest.md` derivative; switched to single bounded `Log.md`. Auto-rotate on `Memory wrap`: entry count > 4 trims to top 3.
- Rotated `Log.md` from 1746 lines (46 entries) to 107 lines (3 entries); preserved BOM. Older entries archived in tag `pre-log-rotate-2026-04-25`.
- `.git/info/exclude` additions: `.claude/skills/`, `.claude/settings.local.json`, `.claude/.credentials.json`.
- Git: created tag `pre-log-rotate-2026-04-25` + pushed to origin; renamed worktree branch `claude/stoic-leakey-24a86b` -> `memory-bound-log`; pushed branch to origin with upstream tracking.
- Notion portal page-sync (post-wrap): updated `Codex and claude code` portal (348a627c-4832-806d-bb91-d34456076c4a) to split into `## Codex` and `## Claude Code` H2 sections; updated header callout to reflect dual-agent ownership; added 2-column Setup / Memory model under Claude Code section; preserved all 7 child page links and Codex System Archive. Verified via re-fetch.
- Synced `page-registry.md` line 9 portal title to exact Notion casing `Codex and claude code` (was `Codex and Claude Code`).
- Built Claude Code Notion sub-portal hierarchy: 1 sub-portal page `Claude Code` (`34da627c-4832-81a4`) + 4 skill detail sub-pages under it — `Claude Code Memory Skill` (full content, mirrors Codex Memory Skill Guide pattern), `Claude Code Notion Workflow` (full content), `Claude Code Triage Skill` (stub, fills next session), `Claude Code Portal Layout` (stub, fills next session). All use Recipe B2 layout (callout / 2-col Quick paths+File split / 2-col Skill+Trigger / Methods / When Not To Use / See Also).
- Built `Portal Layout Skill Guide` (`34da627c-4832-81f8`) as Codex Core Pages 7th entry, full content paralleling other Codex skill guides; positioned between `Notion Workflow` and `Memory` in main portal Core Pages.
- Updated main portal `## Claude Code` section to slim form: replaced 2-column Setup / Memory model with link to sub-portal + 1-line description (sub-pages now hold the depth).
- `page-registry.md`: added 6 new entries (sub-portal + 4 Claude Code skill pages + Codex Portal Layout); registry now tracks 13 managed pages.
- 2026-04-26: Filled previously-stub Notion pages `Claude Code Triage Skill` and `Claude Code Portal Layout` with full content (Recipe B2 layout). Triage page mirrors Codex Triage Skill Guide pattern + adds Vault 11-note-file map + Differences from Codex section. Portal Layout page documents Claude Code-specific Memory.md hard rule trigger, escape hatch, end-of-response self-check. Cleaned 3 Notion auto-format color-leak artifacts via targeted content_update. page-registry.md updated to remove "(stub)" markers.

### Files Changed

- New: `CLAUDE.md`
- Modified: `Memory.md` (added workflow auto-invoke rules + Log auto-rotate rule)
- Modified: `Log.md` (rotated 1639 lines removed + this new entry)
- Local-only (git-ignored): `.claude/skills/notion-workflow-automation/**`, `.claude/skills/notion-portal-layout/**`, `.claude/skills/obsidian-bug-triage/**`, `~/.claude/skills/project-memory-workflow/SKILL.md`
- `.git/info/exclude` (3 patterns added)
- Notion (manual by user): page title `Codex` -> `Codex and Claude Code`

### Validation

- `git check-ignore -v` confirmed all `.claude/skills/**` paths ignored
- Log.md: `xxd` shows BOM `efbb bf` preserved at offset 0; 107 lines; 3 `## YYYY-MM-DD` entries
- CLAUDE.md @imports verified via `tail -12`
- Memory.md new rules confirmed via `grep` at line 39 (`工作流強制規則`) and line 32 (`Log.md 由 Memory wrap 自動 rotate`)
- `page-registry.md` line 9 title updated; description column updated to AI-agent-neutral language
- `notion-portal-layout/SKILL.md` `notion-knowledge-capture` references: `grep -c` returned 0
- Commit `cf28434` on branch `memory-bound-log`; pushed to `origin/memory-bound-log` with upstream tracking
- Tag `pre-log-rotate-2026-04-25` exists locally and pushed to origin

### Blockers

- No blocker for this batch.
- Open items (deferred):
  - `note-map.md` completeness untested — affects Obsidian auto-routing accuracy
  - Workflow auto-invoke rules rely on LLM discipline; no program-enforced PreToolUse hook
  - End-of-response self-check is soft rule; may drift over long sessions

### Next

- ~~Fill content for stub pages~~ DONE 2026-04-26.
- Open new Claude Code session and verify `@Log.md` auto-loads, plus auto-invoke rules fire without prompting (e.g. ask to update a Notion page -> portal gate + layout preflight should appear inline before write).
- Observe soft-rule adherence over 1-2 weeks; if reliability < 90%, consider PreToolUse / UserPromptSubmit hook layer.
- Decide whether to merge `memory-bound-log` into `main` after observation window.
- Verify auto-rotate next time entry count would exceed 4 (this wrap brings count to 4, next wrap triggers rotate to 3).

## 2026-04-20 - AI Chat v0.2 Final Wrap-Up

### Done

- Confirmed the latest production chat streaming behavior on `https://blog.dawn1127.com/network-engineer/chat`.
- Confirmed `Admin-Control-Panel.hta` desktop behavior no longer has popup storm or first-refresh timeout issues.
- Synced the project handoff docs so `0.2` status no longer points at already-finished verification tasks.
- Added `.playwright-cli/` to `.gitignore` so local browser-verification artifacts stay out of git.
- Created and pushed commit `8b2b8f2` with message `release: finalize AI Chat v0.2 wrap-up`, so `origin/main` now reflects the latest `0.2` state.

### Files Changed

- `.gitignore`
- `README.md`
- `Log.md`
- `Memory.md`

### Validation

- User confirmed production chat streaming verification is complete.
- User confirmed `Admin-Control-Panel.hta` verification is complete.
- `git status --short --branch` confirmed local `main` is aligned with `origin/main` after push.
- `git log --oneline --decorate -n 3` showed `8b2b8f2` at `HEAD -> main, origin/main`.
- `.playwright-cli/` is now ignored by git after the `.gitignore` update.

### Blockers

- No blocker remains for the `AI Chat v0.2` wrap-up.

### Next

- Define the first actual capability to build inside `Network PM Automation`.

