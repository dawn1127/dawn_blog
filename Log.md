# Log

Newest entry first. Keep short-term progress here. Do not store durable rules.

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

