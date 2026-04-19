# Architecture

## Deployment Overview

V1 runs first on a Win11 main workstation using WSL2 and Docker Compose. This keeps local development and temporary production close to the future Ubuntu Server deployment model.

The initial deployment topology is:

```text
Internet / users
  -> Nginx VM
  -> Win11 host / WSL2 Docker network
  -> web app
  -> Postgres + pgvector
  -> Redis
  -> MinIO
  -> worker
  -> relay API provider
```

The Nginx VM handles reverse proxy and TLS termination. Docker service ports should not be directly exposed to the internet.

## Services

### Web

The web service is a Next.js App Router application.

Responsibilities:

- render the AI Chat workspace and admin screens;
- handle authentication and sessions;
- expose route handlers for chat, files, artifacts, providers, and models;
- enforce ownership and role checks;
- call provider adapters for chat requests;
- write audit metadata for admin actions.

### Worker

The worker handles asynchronous background tasks.

V1 worker responsibilities:

- process queued Excel/CSV files;
- parse sheets, columns, sample rows, summaries, and row chunks;
- write `FileIndex` data;
- retry failed parse jobs up to 3 times;
- record `parseError` after final failure.

The file parsing worker should not receive provider API keys unless a later task requires model calls. If AI-powered background jobs are added later, use a separate worker process or a minimal secret scope.

### Postgres + pgvector

Postgres stores relational app data:

- users;
- sessions;
- conversations;
- messages;
- file metadata;
- parsed file indexes;
- provider/model metadata;
- runs;
- artifacts;
- audit logs.

`pgvector` is available for future embedding-based retrieval. V1 should still prefer deterministic parsing and structured summaries for Excel/CSV Q&A.

### Redis

Redis supports:

- rate limiting;
- upload quota coordination;
- worker queues;
- transient job state.

Per-user chat rate limit is 20 requests per minute. Per-user queued/processing upload limit is 2 files.

### MinIO

MinIO stores object data:

- original uploaded Excel/CSV files;
- future generated artifact objects.

V1 soft delete hides file and artifact metadata but does not remove MinIO objects. Permanent object cleanup is deferred.

### Nginx VM

The Nginx VM handles:

- public endpoint;
- HTTPS/TLS termination;
- reverse proxy to the app;
- optional IP allowlisting or access rules.

Nginx does not store, inject, or read application secrets.

## Provider Adapter

V1 implements provider adapters for common relay API styles:

- OpenAI Chat Completions: `/v1/chat/completions`.
- OpenAI Responses: `/v1/responses`.
- Claude Messages: `/v1/messages`.

The adapter interface is:

- `chatStream()`;
- `chatComplete()`;
- `embed?()`;
- `listModels?()`;
- `validateConnection()`.

`listModels?()` is optional. If the relay API does not support model listing, admins manually configure models.

## Provider Flow

```text
Admin configures ProviderConfig + ModelConfig
  -> server encrypts API key
  -> admin runs validateConnection()
  -> enabled model appears in chat model selector
  -> user sends message
  -> server loads provider/model metadata
  -> server decrypts API key in runtime memory
  -> ProviderAdapter calls relay API
  -> response streams or completes
  -> message status updates
```

`validateConnection()` must check:

- `baseUrl` is reachable;
- `apiKey` is usable;
- `modelId` can be called;
- streaming behavior matches the model capability flag when enabled;
- response shape matches adapter expectations;
- errors from the relay API are captured and normalized.

Every enabled model should support a smoke test covering:

- normal chat;
- streaming chat when supported;
- malformed or failed provider response handling.

## File Q&A Flow

```text
User uploads Excel/CSV
  -> FileAsset created with parseStatus=queued
  -> object stored in MinIO
  -> worker parses file
  -> FileIndex saved with sheets, columns, samples, summaries, chunks
  -> parseStatus=completed
  -> user references file in chat
  -> server selects relevant summaries/chunks
  -> deterministic checks run where practical
  -> model receives concise grounded context
  -> answer may include sheet/column/row/chunk citations
```

Soft-deleted files are excluded from retrieval and cannot be attached to new messages.

## Secret Boundary

- `APP_ENCRYPTION_KEY` exists only in server/container environment variables.
- `APP_ENCRYPTION_KEY` is never committed, logged, shown in UI, or written into project memory.
- Provider API keys are encrypted in DB as `apiKeyEncrypted`.
- Provider API keys are decrypted only in server runtime memory when needed.
- The browser only receives masked key display and provider/model metadata.
- Worker containers that only parse files do not receive provider API keys.
- Nginx VM only reverse proxies traffic and terminates TLS; it does not hold app secrets.
- Audit logs record metadata only and must not include plaintext API keys, full prompts, or file contents.

## Backup And Restore

V1 must support practical backup before the system is used as temporary production.

Backup scope:

- Postgres dump;
- MinIO object backup;
- selected environment configuration;
- Docker Compose file and deployment notes.

Restore scope:

- restore Postgres data;
- restore MinIO objects;
- restart services;
- verify login;
- verify conversation history;
- verify file metadata;
- verify provider metadata without exposing secrets;
- verify artifact metadata and downloads.

## Win11 To Ubuntu Migration

The project should avoid Windows-only paths and assumptions. Docker Compose service names, volumes, and environment variables should work on Ubuntu with minimal changes.

Migration steps:

1. Stop writes or schedule maintenance.
2. Export Postgres dump.
3. Back up MinIO data.
4. Copy repo and deployment files to Ubuntu Server.
5. Create server-only `.env` from the production values.
6. Restore Postgres and MinIO.
7. Start services with Docker Compose.
8. Point Nginx VM upstream to the Ubuntu Server.
9. Run smoke tests for auth, provider, chat, file Q&A, and artifact download.

## Operational Defaults

- Chat request timeout: 60 seconds.
- Provider connection test timeout: 10 seconds.
- Worker parse retry: 3 attempts.
- Single upload limit: 50MB.
- User upload concurrency: 2 queued/processing files.
- User chat rate limit: 20 requests per minute.
