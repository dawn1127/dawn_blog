# Product Spec

## Product Positioning

Network Engineer AI Platform is an internal engineering assistant platform. V1 focuses on a self-hosted general-purpose AI Chat entry, currently exposed from the `network engineer` section, with conversation history, OpenAI-native file input, image input, and file-grounded Q&A.

The platform starts on a Win11 main workstation using WSL2 and Docker Compose for development and temporary production. An existing Nginx VM provides external reverse proxy and TLS termination. After the product and data model mature, the same deployment pattern should move to Ubuntu Server with Codex/SSH assistance.

## V1 Goals

- Provide a ChatGPT-like AI Chat experience for general internal work, including network engineering use cases.
- Support streaming assistant replies, persistent conversation history, and model selection.
- Support OpenAI-native document uploads and Q&A through Responses `input_file`.
- Support image attachments for vision-capable models, including screenshots pasted into the composer.
- Use relay APIs first, while keeping provider/model configuration abstract enough for official OpenAI, Claude-compatible APIs, other compatible APIs, or local model gateways later.
- Keep V1 read-only from a network operations perspective: AI may generate advice, analysis, Markdown, JSON, and future files, but must not modify devices, push configs, or execute network changes.

## Out Of Scope For V1

- Direct SSH/API execution against network devices.
- Automatic config deployment or rollback.
- Full Network PM automation workflows.
- Permanent delete and object cleanup jobs.
- Provider API key rotation.
- Multi-tenant SaaS billing, public registration, or external customer accounts.

## Roles

- `admin`: manages users, providers, models, connection tests, and audit review.
- `user`: uses AI Chat, uploads files, asks file-grounded questions, and downloads owned artifacts.

Public registration is not part of V1. Accounts are created or managed internally.

## AI Chat

The AI Chat should support:

- creating and listing conversations;
- automatically generating a conversation title from the user's first message, truncated to a practical display length;
- later refining titles through a background job or AI title generator;
- selecting an enabled model;
- streaming responses when the selected model supports streaming;
- falling back to non-streaming completion when streaming is disabled or unsupported;
- persisting user and assistant messages;
- recording message status as `streaming`, `completed`, or `failed`;
- showing both the requested model and the provider response `model` field when available;
- keeping provider errors visible to the user without losing the user's message.

The UI language defaults to Chinese. Network engineering terms may remain in English, such as VLAN, subnet, interface, hostname, BGP, OSPF, ACL, trunk, access port, and routing table.

## Excel/CSV Q&A

V1 supports `.xlsx` and `.csv` uploads up to 50MB per file.

The system should parse files deterministically before involving the model:

- sheet names;
- column names;
- sample rows;
- row chunks;
- structured summaries;
- basic deterministic checks where practical, such as duplicate IPs or grouped VLAN rows.

File Q&A should prefer deterministic parsing and structured summaries over pure embedding-based guessing. If a question can be answered by program logic, the system should compute the facts first and use AI for explanation, formatting, and context.

Answers may include source references:

- sheet name;
- column name;
- row range;
- chunk id.

Soft-deleted files must not be available as retrieval context.

## Image Attachments

V1 supports PNG, JPEG, WEBP, and non-animated GIF image uploads up to 20MB.

Users can:

- upload images from the composer `+` menu;
- paste Windows screenshots into the composer;
- drag images into the chat area;
- see image thumbnails in composer chips and message history.

Images are stored in MinIO and sent server-side to models marked `supportsImages=true`. Documents are stored in MinIO and sent server-side to OpenAI Responses models marked `supportsNativeFiles=true`. Local parsing remains a future setting for relay APIs.

## Provider Management

V1 uses provider adapters for OpenAI Chat Completions, OpenAI Responses, and Claude Messages style relay APIs. A provider represents an endpoint, API style, and secret. A model represents a specific model under a provider.

Admin users can:

- create, edit, enable, and disable providers;
- configure provider `name`, `baseUrl`, `apiStyle`, and API key;
- create, edit, enable, disable, and sort models under a provider;
- mark one default model per provider;
- set model capabilities such as streaming, embeddings, files, and JSON mode;
- run provider/model connection tests.

Provider API keys are encrypted at rest and masked everywhere outside server runtime.

## Data Retention

V1 retains:

- conversations;
- messages;
- file metadata;
- original uploaded objects;
- parsed file indexes;
- runs;
- artifacts;
- provider and model metadata;
- audit logs.

Retention continues until an admin or owner performs a supported delete action. Soft delete hides data from normal views while preserving traceability.

## Deletion Policy

- Admin may hard delete providers and models from the Provider Admin GUI, including providers/models already referenced by conversations, messages, or runs.
- When a referenced provider/model is hard deleted, historical conversation/message/run content remains, while provider/model foreign keys are set to `null`.
- Provider/model hard delete must write an `AuditLog` entry with metadata only; plaintext API keys are never logged.
- Conversations, file assets, and artifacts use soft delete in V1 through `deletedAt`.
- Soft-deleted conversations cannot accept new messages.
- Soft-deleted files cannot be used for retrieval.
- Soft-deleted artifacts cannot be downloaded.
- Original MinIO objects remain after soft delete in V1.
- Permanent delete and MinIO object cleanup are deferred to a later version.

## Security Boundary

- AI output is advisory unless explicitly implemented as a later approved workflow.
- Provider API keys never reach the browser.
- Logs, audit records, and documentation must not include plaintext API keys, full prompts, or file contents.
- Admin audit entries should record metadata only.
- Server-side ownership checks are required for every protected read/write API.

## Runtime Policies

- Chat request timeout: 60 seconds.
- Provider connection test timeout: 10 seconds.
- Worker parse retry: maximum 3 attempts.
- Single file upload limit: 50MB.
- Per-user queued/processing upload limit: 2 files.
- Per-user chat rate limit: 20 requests per minute.
- Rate limit is implemented with Redis.
- Upload quota is enforced with DB and/or Redis state checks.

## V1 Success Criteria

V1 is successful when an authenticated user can:

- log in;
- choose an enabled model;
- start a conversation;
- receive streamed or completed assistant responses;
- upload an Excel/CSV file;
- see parse status;
- ask questions grounded in the parsed file;
- receive answers with source references;
- view conversation history after refresh;
- download saved Markdown/JSON artifacts when generated.

Admins must also be able to configure relay providers and models without exposing provider secrets to the frontend.
