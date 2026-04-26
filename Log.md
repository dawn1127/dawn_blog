# Log

Newest entry first. Keep short-term progress here. Do not store durable rules.

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

## 2026-04-20 - Win11 Repo Encoding Governance

### Done

- Standardized the repo text-encoding policy for Win11 and Windows PowerShell 5.1 compatibility.
- Added `.editorconfig` and `.gitattributes` so the repo now has explicit text/eol guardrails instead of relying on editor defaults.
- Normalized all tracked text files to the final policy:
  - default: UTF-8 without BOM
  - exceptions: `README.md`, `Log.md`, `Memory.md`, and `*.ps1` use UTF-8 with BOM
- Updated `Memory.md` so future memory workflows treat the memory handoff files and PowerShell-sensitive files with the new encoding policy.

### Files Changed

- `.editorconfig`
- `.gitattributes`
- `README.md`
- `Log.md`
- `Memory.md`
- tracked repo text files normalized for encoding policy compliance

### Validation

- Node scan confirmed the tracked-text-file policy is consistent across the repo:
  - `README.md`, `Log.md`, `Memory.md`, and `*.ps1` are UTF-8 with BOM
  - other tracked text files are UTF-8 without BOM
- Windows PowerShell 5.1 `Get-Content` checks on `README.md`, `Log.md`, and `Memory.md` no longer showed visible mojibake
- Re-read `.editorconfig` and `.gitattributes` after normalization to confirm the guardrails were saved correctly

### Blockers

- No blocker for the encoding governance itself.
- The repo still relies on workflow discipline rather than an automated encoding audit, so future drift is less likely but not impossible.

### Next

- Keep the production chat streaming verification as the main product next step.
- If encoding drift appears again, consider adding a lightweight encoding audit command to the repo verify flow.

## 2026-04-20 - Chat Empty-State Garbled Text Hotfix

### Done

- Confirmed the latest Chat empty-state mojibake was not caused by provider data, bootstrap recovery, or database state.
- Traced the visible garbled text to three corrupted source strings in `src/components/chat-workspace.tsx`.
- Applied a minimal hotfix that only restored the affected Chat copy:
  - `尚未配置可用模型`
  - `有什麼可以幫你？`
  - `可以貼上截圖、拖入圖片，或加入文件一起問。`

### Files Changed

- `src/components/chat-workspace.tsx`
- `Log.md`

### Validation

- UTF-8 direct file read confirmed the three Chat strings are now stored as correct Chinese text.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- User manually hard-refreshed `http://localhost:3000/network-engineer/chat` and confirmed the empty-state title, description, and no-model status render correctly.

### Blockers

- No blocker for this hotfix after manual browser verification.

### Next

- Return to the higher-priority pending manual verification of the latest production chat streaming behavior.

