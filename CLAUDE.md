# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Authoritative project docs

Before coding, read these — they contain rules and context not derivable from source:

- `Memory.md` — long-term working rules, user preferences, naming conventions, encoding policy, version strategy. **Treat as binding.**
- `Log.md` — session history. Skim latest entries to understand recent work; append to it when wrapping a session.
- `README.md` — product status, resume checklist, current provider setup, next development targets.
- `ADMIN-RUNBOOK.md` — start/stop/restart/status procedures for local and compose modes.
- `product-spec.md`, `architecture.md`, `data-model.md`, `milestone-v1.md` — V1 product and engineering specs.

If rules in `Memory.md` and this file conflict, `Memory.md` wins.

## Collaboration preferences

- 預設使用中文溝通；回答先給結論，再給必要細節。
- 遇問題優先直接修復，再解釋原因；不要空泛描述。
- 改代碼前先檢查現狀（目錄、關鍵文件、運行方式），改後至少做一次基礎校驗。
- 收尾時更新 `Log.md`；只有長期規則才進 `Memory.md`；架構或入口變更才動 `README.md`。
- 編輯含中文的 `.ts`/`.tsx`/`.md` 時，優先用 `apply_patch`，避免 PowerShell 管線重寫。
- 檔案編碼預設 UTF-8 without BOM；僅 `README.md`、`Log.md`、`Memory.md`、`*.ps1` 使用 UTF-8 with BOM。

## Commands

```bash
npm run dev          # Next.js dev server
npm run worker       # Background file-parse worker (run in parallel with dev)
npm run verify       # typecheck + lint + build (pre-ship gate)
npm run lint
npm run typecheck
npm run build

npm run prisma:generate   # After any schema change
npm run prisma:migrate    # Dev migration
npm run prisma:deploy     # Production migration
npm run prisma:seed       # Bootstrap admin
```

**Local dev requires two processes:** `npm run dev` + `npm run worker` in separate terminals. Windows admins use `scripts/start-local.ps1` / `status-local.ps1` / `restart-local.ps1` / `stop-local.ps1` instead.

After changing `prisma/schema.prisma`: run `prisma:migrate` (or `prisma:deploy`) then `prisma:generate`. Pre-ship minimum is typecheck + lint; for UI/API changes also run build.

No automated tests or CI. Verification is manual via `npm run verify` plus targeted UI checks from the `README.md` resume checklist.

## Architecture

Internal AI workspace for network engineering teams. Multi-provider AI chat with file Q&A (Excel/CSV), image attachments, and a provider/model admin panel. **Read-only advisory only** — no SSH, device mutation, or config deployment.

### Service topology

| Service | Role |
|---|---|
| **Next.js web** (`src/app/`) | Auth, chat, file, admin API + all UI |
| **Background worker** (`src/worker/parse-files.ts`) | Async Excel/CSV parsing; does NOT hold provider API keys |
| **PostgreSQL + pgvector** | Relational data; pgvector available but V1 prefers deterministic parsing over embeddings |
| **Redis** | Rate limiting, worker job queues, upload concurrency |
| **MinIO** | S3-compatible object storage for uploaded files and images |
| **Nginx** (external VM) | TLS termination + reverse proxy; not in this repo |

### Key data flows (non-obvious, spans multiple files)

**File Q&A:** user uploads Excel/CSV → `FileAsset` created with `parseStatus=queued` → object stored in MinIO → worker picks up job → writes `FileIndex` (sheets, columns, samples, chunks) → chat route selects relevant chunks → model receives grounded context with citations.

**Chat with provider:** admin configures `ProviderConfig` + `ModelConfig` via `/settings?tab=providers` (API key encrypted with `APP_ENCRYPTION_KEY` at rest) → `validateConnection()` confirms → enabled model appears in chat selector → user sends message → server decrypts key in request scope → `ProviderAdapter` calls relay → response streams back.

**Provider API styles supported:** OpenAI Chat Completions, OpenAI Responses, Claude Messages.

### Auth

Stateless JWT cookies with 10-minute sliding timeout. Session `Secure` flag is set only when `x-forwarded-proto=https` so external HTTPS and direct local HTTP both work. All non-`/login` pages require a session at the `proxy.ts` boundary; page/API handlers re-check as a second layer. No DB-backed session table, no remember-me.

### Key modules under `src/lib/`

- `env.ts` — Zod-validated env schema; all env vars must be declared here first
- `db.ts` — Prisma client singleton
- `security/crypto.ts` — encrypts/decrypts provider API keys
- `provider/` — `ProviderAdapter` abstractions (OpenAI Chat, OpenAI Responses, Claude Messages)
- `rate-limit.ts` — generic fixed-window Redis limiter; callers pass their own key/limit/window
- `audit.ts` — audit log writer; all deletes are soft (`deletedAt` stamp) to preserve trail
- `auth/` — JWT issue/verify, refresh, session validation

### Database

Schema in `prisma/schema.prisma`. **Deletes are soft** (set `deletedAt`) except for provider/model admin hard-delete, which nulls the reference on historical conversations/messages/runs. pgvector extension is available in the Postgres image but V1 does not use embeddings for file Q&A.

### Frontend notes

App Router under `src/app/`. Main chat UI: `src/components/chat-workspace.tsx`. UI defaults to Traditional Chinese; network terminology stays in English. Global nav: Home / Dawn Blog / Network Engineer. AI Chat entry is `/network-engineer/chat` — **do not restore `/chat` alias**.

## Version strategy

Pre-1.0 cadence. App displays `0.2`; `1.0` is reserved for formal stable release. Small feature updates bump to `0.21`, `0.22`; larger architectural shifts go to `0.3`.

## Deployment

`compose.yaml` defines postgres / redis / minio / web / worker. External HTTPS terminates at Nginx Proxy Manager and forwards to `http://192.168.1.20:3000`. Before switching the public domain to compose mode, stop local mode first. Bootstrap admin password lives in `.env` as `BOOTSTRAP_ADMIN_PASSWORD` — never write it into docs or logs.

## Memory imports

Auto-loaded at every session start so new sessions know the project without running `Memory load`.

@Memory.md
@README.md
@Log.md

`Log.md` is bounded to recent 7 entries by `project-memory-workflow` auto-rotate during `Memory wrap` (trim to 7 when total > 10). Older history lives in git (`git show pre-log-rotate-2026-04-25:Log.md` or `git log -p Log.md`).
