# Network Engineer AI Platform

## Goal

Internal AI workspace for network-focused teams. Current pre-1.0 work centers on a general-purpose AI Chat experience with conversation history, relay provider configuration, OpenAI-native file input, image input, and file-grounded Q&A foundations.

## Version

- Current app version: `0.2`.
- Next routine feature version: `0.21`.
- Larger architecture milestones can move to `0.3`.
- `AI Chat v0.2` has passed the current manual verification gate.
- The stable formal release line starts at `1.0`.

## Stack

- Language: TypeScript
- Framework: Next.js App Router
- Data: PostgreSQL + Prisma, with pgvector-ready Postgres image in Docker Compose
- Queue/cache/rate limit: Redis
- Object storage: MinIO
- File parsing: ExcelJS and csv-parse
- Runtime: Win11 + WSL2/Docker Compose first, Ubuntu Server later

## Commands

```bash
# install dependencies
npm install

# generate Prisma client
npm run prisma:generate

# run database migrations
npm run prisma:deploy

# seed bootstrap admin
npm run prisma:seed

# run app locally
npm run dev

# run file parse worker
npm run worker

# run static verification
npm run verify

# first run helper on Windows/PowerShell
.\scripts\first-run.ps1

# recommended daily admin commands
.\scripts\start-local.ps1
.\scripts\status-local.ps1
.\scripts\restart-local.ps1
.\scripts\stop-local.ps1

# backup full compose mode
.\scripts\start-compose.ps1
.\scripts\stop-compose.ps1

# optional CLI fallback: add AI Coding 2233 relay provider and gpt-5.4 model
.\scripts\add-ai-coding-provider.ps1

# verify
npm run lint
npm run typecheck
npm run build
```

## Local Runtime

- App URL: `http://localhost:3000`.
- Current app version: `0.2`.
- Public home: `/`.
- Dawn Blog: `/blog`.
- Login page: `/login` is the shared site-wide sign-in entry.
- Network Engineer home: `/network-engineer`.
- Chat page: `/network-engineer/chat` for the current general-purpose AI Chat workspace.
- Network PM Automation page: `/network-engineer/network-pm-automation`.
- Legacy compatibility route: `/network-engineer/excel-automation` redirects to `Network PM Automation` after auth.
- Settings page: `/settings` for Artifacts, Provider & Models, System Health, and document mode.
- Auth sessions use a 10-minute sliding JWT/cookie timeout. Active UI pages refresh through `/api/auth/refresh`; idle timeout redirects to `/login?reason=timeout`.
- Direct sign-in from `/login` now lands on `/`; this round does not add `returnTo` / `next` redirect recovery.
- Authenticated users have a top-nav `登出` action.
- Global navigation: Home, Dawn Blog, Network Engineer, and future development are shown from every UI page.
- Network Engineer navigation: AI Chat, Network PM Automation, and future Network Engineer tools share the same section navigation.
- Admin start/stop guide: see `ADMIN-RUNBOOK.md`.
- Double-click `Admin-Control-Panel.hta` for the local control panel.
- `.\scripts\status-local-runner.ps1` is the hidden helper used by `Admin-Control-Panel.hta` for background status refresh.
- Recommended daily runtime flow on Windows:
  - `.\scripts\start-local.ps1`
  - `.\scripts\status-local.ps1`
  - `.\scripts\restart-local.ps1`
  - `.\scripts\stop-local.ps1`
- Backup mode only: `.\scripts\start-compose.ps1` and `.\scripts\stop-compose.ps1`.
- Bootstrap admin login: `admin`.
- Bootstrap admin password: stored in local `.env` as `BOOTSTRAP_ADMIN_PASSWORD`; never write it into docs or logs.
- Docker Compose services: `network-ai-postgres`, `network-ai-redis`, `network-ai-minio`.
- Main service ports: app `3000`, Postgres `5432`, Redis `6379`, MinIO API `9000`, MinIO console `9001`.
- Background worker command: `npm run worker`.
- Dev server command: `npm run dev`.

## Resume Checklist

For a new chat or fresh session:

1. Read `README.md`, latest entries in `Log.md`, then `Memory.md`.
2. Prefer `.\scripts\status-local.ps1` to see whether the local runtime is already up.
3. If local mode is stopped, run `.\scripts\start-local.ps1`.
4. If you need full-container fallback instead, stop local mode first, then run `.\scripts\start-compose.ps1`.
5. Use `.\scripts\restart-local.ps1` when PID files drift or the local runtime needs a clean reset.
6. Confirm schema with `npx prisma migrate status`.
7. Use `/settings?tab=system` to check DB, Redis, MinIO, env, provider/model counts, and file queue state.
8. Use `/settings?tab=providers` to edit provider keys and model capabilities through GUI only.
9. Use `/network-engineer/chat` for the general-purpose AI Chat workspace and verify model routing from requested model metadata plus `response model` metadata, not the model's self-description.
10. Before finishing code changes, run at least `npm run typecheck` and `npm run lint`; run `npm run build` for UI/API changes.

## Memory Confirm

For a new chat after a long session, do `memory load`, then a cold-start check before coding. The handoff passes only if the new chat can answer all of these from `README.md`, `Log.md`, and `Memory.md` alone:

1. What the project is building and what V1 currently includes.
2. How to start, stop, restart, and inspect the local runtime.
3. What the latest completed work is.
4. What the current highest-priority unfinished task is.
5. What blocker or verification item is still open.
6. What long-term user preferences and working rules must be followed.

## Structure

- `src/app/`: Next.js pages and API route handlers.
- `src/components/`: Client UI components for login, chat workspace, settings, provider admin, artifacts, and system health.
- `src/lib/`: Server utilities for auth, DB, provider adapter, storage, audit, encryption, and rate limit.
- `src/worker/`: Background file parsing worker.
- `prisma/`: Prisma schema, migration SQL, and seed script.
- `scripts/`: Windows runtime/admin helpers, verification helpers, and backup tooling.
- `ADMIN-RUNBOOK.md`: administrator start/stop/status/restart guide for local and compose runtime modes.
- `product-spec.md`, `architecture.md`, `data-model.md`, `milestone-v1.md`: V1 product and engineering specs.

## Current Provider Setup

Current local DB metadata, without secrets:

- Provider: `OpenAI Official`.
- Base URL: `https://api.openai.com`.
- API style: `openai_responses`.
- Model ID: `gpt-5.4`.
- Display name: `gpt-5.4`.
- Enabled: yes.
- Default: yes.

If changing provider keys, use `/settings?tab=providers`. The UI masks keys and the server stores only encrypted key material.

## Decisions

- Provider access uses `ProviderConfig` + `ModelConfig`; V1 supports OpenAI Chat Completions, OpenAI Responses, and Claude Messages style relay APIs.
- Provider API keys are encrypted at rest with `APP_ENCRYPTION_KEY` and only decrypted in server runtime.
- Provider API keys are entered and rotated through the Admin Provider GUI; scripts are optional fallback tools.
- Win11 temporary production should use WSL2 + Docker Compose and later move to Ubuntu Server.
- V1 AI behavior is advisory only: no device changes, config pushes, SSH automation, or network mutation.
- File attachments currently default to OpenAI native file input through the Responses API.
- `supportsNativeFiles` is separate from `supportsFiles`; `supportsFiles` is reserved for the future local parsing/retrieval mode.
- Do not validate model identity by asking the model what it is; use requested model metadata plus the provider response `model` field shown in Chat UI and saved message metadata.
- Provider/model admin hard delete is allowed even after historical use; related conversation/message/run content remains, but provider/model metadata is set to null.
- Auth remains stateless JWT cookie based for now; there is no DB-backed session table or remember-me mode.
- Chat history image attachments open in an in-page modal and download through `/api/files/{fileId}/download`; non-image attachments download directly from the attachment card.

## Status

- Done: pre-1.0 specs, Next.js app skeleton, Prisma data model, provider adapters, auth routes, Provider Admin UI/API, persistent conversation list/messages, chat route/UI, OpenAI native file input, image upload/paste/drag support, message attachment history, artifact API/UI, run traceability, System Health page/API, first-run scripts, Docker Compose foundation, live Docker startup, GUI provider key rotation, official OpenAI `gpt-5.4` provider/model setup, provider response model capture, OpenAI-style Chat UI, assistant Markdown rendering, smart composer model/thinking selector, single-level Projects, unified Settings page, model editing with native file capability, public top-level site structure, Network Engineer subroutes, shared global navigation/breadcrumb frame, 10-minute sliding session timeout with active logout, Chat attachment image modal/direct file download interactions, and the Win11 `Admin-Control-Panel.hta` local operations console with structured status JSON.
- Done: `AI Chat v0.2` milestone is accepted from the current manual validation pass.
- Next first action: prepare the first actual capability inside `Network PM Automation`.
- Secondary open item: reopen `Admin-Control-Panel.hta` and verify two things only: no popup storm and no first-refresh timeout. This HTA check is not part of the `0.2` blocker set.

## Next Development Targets

- Test official OpenAI `gpt-5.4` chat through the app with normal, streaming, provider-error, response model display, image input, native file input, and Enter-to-send cases.
- Test `智能 -> 延伸` through OpenAI Responses and confirm the provider accepts the mapped reasoning effort.
- Upload a supported document through the Chat composer `+` menu and send with a model that has `supportsNativeFiles` enabled.
- Paste a Windows screenshot or drag an image into Chat, confirm it becomes an image chip, then send with a model that has `supportsImages` enabled.
- Ask file-grounded questions about IP, VLAN, hostname, duplicate values, and row references.
- Improve deterministic retrieval for common network inventory questions before relying on model reasoning.
- Add better model validation output in Admin UI if provider errors need clearer diagnosis.
- Define the first actual capability to build inside `Network PM Automation`.
- Convert the new tool from placeholder state into its first usable workflow.
- Reopen `Admin-Control-Panel.hta` and verify desktop launch behavior for no popup storm and no first-refresh timeout.

## Notes

- Do not commit `.env` or real provider keys.
- Docker Desktop + WSL2 is available locally and compose services have been validated.
- `xlsx` was avoided because npm audit reports high severity vulnerabilities with no fix. Use ExcelJS and csv-parse instead.

