# Milestone V1

## Overview

V1 should be built in small, verifiable stages. Each stage has a clear done definition so implementation can stop, test, and checkpoint before moving forward.

Recommended order:

1. Auth.
2. Provider CRUD + encryption.
3. Model test + capability fallback.
4. Chat.
5. File upload.
6. Worker parse.
7. Retrieval.
8. Backup/restore.
9. Artifact.
10. Ubuntu dry run.

Backup/restore is intentionally before artifact completion because Win11 temporary production should have a tested recovery path early.

## 1. Auth

Scope:

- local accounts;
- admin/user roles;
- session handling;
- protected API guard;
- server-side ownership checks.

Done criteria:

- users can log in and log out;
- disabled users cannot log in;
- unauthenticated users cannot access protected APIs;
- normal users cannot read other users' conversations, files, runs, or artifacts;
- admin-only routes reject non-admin users.

## 2. Provider CRUD + Encryption

Scope:

- admin provider list/create/edit/disable;
- model list/create/edit/disable under provider;
- encrypted API key storage;
- masked key display;
- uniqueness and default model constraints;
- audit log for key provider/model changes.

Done criteria:

- admin can create and edit a provider with `name`, `baseUrl`, `apiStyle`, and API key;
- API key is stored only as encrypted data;
- frontend displays only a masked key;
- `ProviderConfig.name` uniqueness is enforced;
- `ModelConfig(providerId, modelId)` uniqueness is enforced;
- each provider can have at most one default model;
- provider/model create, update, disable, API key update, and default model changes write `AuditLog` metadata.

## 3. Model Test + Capability Fallback

Scope:

- OpenAI-compatible provider adapter;
- `validateConnection()`;
- optional `listModels?()`;
- normal chat smoke test;
- streaming smoke test;
- provider error normalization;
- capability-based UI and backend behavior.

Done criteria:

- admin can test a provider/model connection;
- failed base URL, invalid key, unavailable model, invalid streaming response, and non-standard error response show clear errors;
- enabled models pass at least normal chat smoke test;
- models marked `supportsStreaming=false` use non-streaming completion;
- models marked `supportsFiles=false` cannot be selected for file-grounded chat;
- models marked `supportsJsonMode=false` are not called with strict JSON mode;
- connection test timeout is 10 seconds.

## 4. Chat

Scope:

- conversation list;
- new conversation creation;
- automatic title from first message;
- model selector;
- message persistence;
- streaming UI;
- non-streaming fallback;
- message status transitions.

Done criteria:

- user can select an enabled model;
- user can start a new conversation;
- conversation title is generated from the first user message;
- `lastMessageAt` updates after messages;
- user message persists before provider call;
- assistant message status transitions from `streaming` to `completed` or `failed`;
- provider errors are visible to the user;
- refreshing the browser keeps conversation history.

## 5. File Upload

Scope:

- Excel/CSV upload endpoint;
- MinIO object storage;
- `FileAsset` creation;
- file size and type validation;
- upload quota enforcement.

Done criteria:

- user can upload `.xlsx` and `.csv`;
- file metadata includes `mimeType`, `sizeBytes`, and `parseStatus`;
- files over 50MB are rejected;
- unsupported file types are rejected;
- empty or invalid files return clear errors;
- per-user queued/processing upload limit of 2 is enforced;
- uploaded files appear in the user's file list;
- users cannot access other users' files.

## 6. Worker Parse

Scope:

- file parse queue;
- worker job processor;
- sheet and column extraction;
- sample rows;
- row chunks;
- structured summaries;
- deterministic findings where practical;
- retry and failure status.

Done criteria:

- worker picks up queued files;
- `parseStatus` changes from `queued` to `processing` to `completed` or `failed`;
- parsed files have sheet summaries, column summaries, sample rows, and chunks;
- parse failures record `parseError`;
- parse jobs retry at most 3 times;
- failed jobs do not block other queued jobs.

## 7. Retrieval

Scope:

- attach parsed files to chat context;
- select relevant file summaries/chunks;
- deterministic checks for questions such as duplicate IPs or VLAN grouping where practical;
- citation formatting;
- soft delete exclusion.

Done criteria:

- chat can reference a completed parsed file;
- soft-deleted files cannot be attached or retrieved;
- answers can include sheet name, column name, row range, or chunk id;
- questions about duplicate IPs, VLAN device lists, and column statistics can be answered from a representative Excel file;
- provider failure during file Q&A keeps user message and shows an error.

## 8. Backup/Restore

Scope:

- Postgres backup;
- MinIO backup;
- environment/deployment notes;
- restore procedure;
- basic recovery smoke test.

Done criteria:

- Postgres data can be exported;
- MinIO objects can be backed up;
- environment requirements are documented without committing secrets;
- a clean environment can restore the backup;
- after restore, login works;
- conversations, file metadata, provider metadata, and artifact metadata remain available;
- provider secrets remain encrypted and are not printed by the backup process.

## 9. Artifact

Scope:

- Markdown/JSON artifact model;
- artifact list;
- artifact download/view endpoint;
- run traceability.

Done criteria:

- Markdown/JSON artifacts can be saved;
- artifacts can be listed by owner;
- artifacts can be viewed or downloaded when not soft-deleted;
- soft-deleted artifacts cannot be downloaded;
- each artifact links to a run;
- the run can trace back to conversation, message, provider, and model where applicable.

## 10. Ubuntu Dry Run

Scope:

- deploy same Docker Compose stack to Ubuntu test server;
- restore backup;
- validate Nginx reverse proxy path;
- verify no Windows-only path assumptions.

Done criteria:

- services start on Ubuntu with the same compose design;
- Postgres, Redis, MinIO, web, and worker are healthy;
- restored data is visible;
- auth works;
- provider smoke test works;
- chat works;
- file upload and parse works;
- file-grounded Q&A works;
- Nginx VM can reverse proxy to Ubuntu Server.

## V1 Exit Criteria

V1 is complete when:

- all milestones above meet done criteria;
- no protected API trusts frontend-only authorization;
- no plaintext provider key appears in frontend, app logs, audit logs, or docs;
- Win11/WSL2 temporary production has a tested backup/restore path;
- Ubuntu dry run proves the deployment can move off the workstation.
