# Data Model

## Conventions

- Primary keys use `id`.
- Timestamps use `createdAt` and `updatedAt`.
- Soft-deletable entities use nullable `deletedAt`.
- Ownership must be enforced server-side for every protected API.
- Enum values are stored as constrained strings or equivalent database enums.

## User

Represents a local platform account.

Fields:

- `id`: primary key.
- `login`: unique username or email-style login.
- `displayName`: user-facing name.
- `passwordHash`: hashed password.
- `role`: `admin` or `user`.
- `enabled`: boolean.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Constraints:

- `login` is unique.
- Disabled users cannot start new sessions.

## Conversation

Represents an AI Chat thread.

Fields:

- `id`: primary key.
- `userId`: foreign key to `User.id`.
- `folderId`: nullable foreign key to `ConversationFolder.id`.
- `sectionId`: defaults to `network-engineer`.
- `title`: generated from the first user message, later refinable by background job or AI.
- `lastMessageAt`: timestamp for list sorting.
- `defaultProviderId`: optional foreign key to `ProviderConfig.id`.
- `defaultModelConfigId`: optional foreign key to `ModelConfig.id`.
- `deletedAt`: nullable soft delete timestamp.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Ownership:

- Owned by `userId`.
- Users may only read and mutate their own conversations unless admin functionality explicitly allows otherwise.

Rules:

- Soft-deleted conversations are hidden from normal lists.
- Soft-deleted conversations cannot accept new messages.
- New conversation titles initially use the first user message truncated to a practical display length.

## ConversationFolder

Represents a single-level Project in the Chat sidebar.

Fields:

- `id`: primary key.
- `userId`: foreign key to `User.id`.
- `name`: display name.
- `sortOrder`: integer for future ordering.
- `deletedAt`: nullable soft delete timestamp.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Rules:

- Folders are owned by `userId`.
- V1 folders are single-level only.
- Deleting a folder moves conversations back to unfiled/recent instead of deleting conversations.

## Message

Represents a message inside a conversation.

Fields:

- `id`: primary key.
- `conversationId`: foreign key to `Conversation.id`.
- `role`: `user`, `assistant`, `system`, or `tool`.
- `status`: `streaming`, `completed`, or `failed`.
- `content`: message text or serialized UI message payload.
- `providerId`: optional foreign key to `ProviderConfig.id`.
- `modelConfigId`: optional foreign key to `ModelConfig.id`.
- `providerResponseModel`: nullable model identifier copied from the provider response `model` field.
- `errorMessage`: nullable user-safe error summary.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Constraints:

- `conversationId` references an existing conversation.
- Messages cannot be appended to a soft-deleted conversation.

Rules:

- User messages should be persisted before provider calls.
- Failed assistant messages should keep enough status metadata to make the error visible and recoverable.
- Assistant messages should persist both the requested `modelConfigId` and the provider-returned `providerResponseModel` when available, because relay APIs may route or alias model names.
- User message attachments are represented by `MessageAttachment`.

## FileAsset

Represents an uploaded file.

Fields:

- `id`: primary key.
- `ownerId`: foreign key to `User.id`.
- `kind`: `spreadsheet`, `document`, or `image`.
- `originalName`: original uploaded filename.
- `mimeType`: detected MIME type.
- `sizeBytes`: file size in bytes.
- `storageKey`: MinIO object key.
- `parseStatus`: `queued`, `processing`, `completed`, or `failed`.
- `parseAttempts`: number of parse attempts, failed after 3 attempts.
- `parseError`: nullable user-safe parse error.
- `deletedAt`: nullable soft delete timestamp.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Ownership:

- Owned by `ownerId`.
- Users may only read, attach, or delete their own files unless admin functionality explicitly allows otherwise.

Rules:

- Maximum file size is 50MB.
- Image file size limit is 20MB.
- Soft-deleted files are hidden from normal lists.
- Soft-deleted files cannot be attached to new messages or used in retrieval.
- Original MinIO objects are retained after V1 soft delete.
- Image assets are stored in MinIO and marked `completed` immediately; they are not parsed by the worker.

## MessageAttachment

Represents the files attached to a user message.

Fields:

- `id`: primary key.
- `messageId`: foreign key to `Message.id`.
- `fileAssetId`: foreign key to `FileAsset.id`.
- `sortOrder`: attachment order.
- `createdAt`: timestamp.

Rules:

- Attachments preserve the exact files/images sent with a message.
- Historical image attachments are displayed as lightweight thumbnails when the file is still available.
- Soft-deleted files remain referenced but are shown as unavailable.

## FileIndex

Represents parsed and searchable metadata for a file.

Fields:

- `id`: primary key.
- `fileAssetId`: foreign key to `FileAsset.id`, unique.
- `sheetSummaries`: JSON summary of sheets.
- `columnSummaries`: JSON summary of columns.
- `sampleRows`: JSON sample rows.
- `chunks`: JSON row or table chunks with chunk ids.
- `deterministicFindings`: JSON findings such as duplicate IPs when available.
- `embeddingStatus`: optional status for future embedding workflow.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Constraints:

- One `FileIndex` per `FileAsset`.

Rules:

- File Q&A should prefer `FileIndex` summaries and deterministic findings before model inference.
- References should be able to identify sheet name, column name, row range, or chunk id.

## Run

Represents an AI/tool execution event.

Fields:

- `id`: primary key.
- `userId`: foreign key to `User.id`.
- `toolId`: string, such as `network-chat` or future tool ids.
- `conversationId`: optional foreign key to `Conversation.id`.
- `messageId`: optional foreign key to `Message.id`.
- `providerId`: optional foreign key to `ProviderConfig.id`.
- `modelConfigId`: optional foreign key to `ModelConfig.id`.
- `status`: `queued`, `running`, `completed`, or `failed`.
- `inputFileIds`: JSON array of `FileAsset.id` values or a join table in implementation.
- `errorMessage`: nullable user-safe error summary.
- `startedAt`: nullable timestamp.
- `completedAt`: nullable timestamp.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Ownership:

- Owned by `userId`.

Rules:

- Runs provide traceability between chat/tool actions and generated artifacts.
- Runs that reference disabled historical models remain readable.

## Artifact

Represents a generated output.

Fields:

- `id`: primary key.
- `ownerId`: foreign key to `User.id`.
- `runId`: foreign key to `Run.id`.
- `title`: display title.
- `type`: `markdown`, `json`, or future artifact type.
- `storageKey`: optional MinIO object key.
- `inlineContent`: optional content for small Markdown/JSON artifacts.
- `deletedAt`: nullable soft delete timestamp.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Ownership:

- Owned by `ownerId`.

Rules:

- V1 supports Markdown/JSON artifacts first.
- Excel artifact generation is deferred to V1.1 or the Excel automation tool.
- Soft-deleted artifacts are hidden from normal lists and cannot be downloaded.
- Artifacts must be traceable to `Run`, and through `Run` to conversation, message, provider, and model where applicable.

## ProviderConfig

Represents an AI relay endpoint and encrypted secret.

Fields:

- `id`: primary key.
- `name`: unique provider display name.
- `baseUrl`: relay base URL.
- `apiStyle`: `openai_compatible`, `openai_responses`, or `anthropic_messages`.
- `apiKeyEncrypted`: encrypted API key.
- `apiKeyMasked`: optional stored or derived masked display value.
- `enabled`: boolean.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Constraints:

- `name` is unique.

Deletion:

- Admin may hard delete a provider, including referenced providers.
- Deleting a provider first deletes its `ModelConfig` children.
- Historical `Conversation`, `Message`, and `Run` provider/model foreign keys use `ON DELETE SET NULL`; content remains readable but provider/model metadata may disappear.
- Provider hard delete must write an `AuditLog` entry without plaintext API key data.

Security:

- Plaintext API key never leaves server runtime memory.
- Frontend only receives masked key metadata.

## ModelConfig

Represents a specific model under a provider.

Fields:

- `id`: primary key.
- `providerId`: foreign key to `ProviderConfig.id`.
- `modelId`: provider model identifier.
- `displayName`: user-facing model name.
- `supportsStreaming`: boolean.
- `supportsEmbeddings`: boolean.
- `supportsFiles`: boolean.
- `supportsImages`: boolean.
- `supportsNativeFiles`: boolean for OpenAI Responses native `input_file`.
- `supportsJsonMode`: boolean.
- `enabled`: boolean.
- `isDefault`: boolean.
- `sortOrder`: integer.
- `maxInputTokens`: nullable integer.
- `notes`: nullable admin notes.
- `createdAt`: timestamp.
- `updatedAt`: timestamp.

Constraints:

- Unique pair: `providerId`, `modelId`.
- Each provider may have at most one model with `isDefault=true`.

Deletion:

- Admin may hard delete a model, including referenced models.
- Historical `Conversation`, `Message`, and `Run` model foreign keys use `ON DELETE SET NULL`; content remains readable but model metadata may disappear.
- Model hard delete must write an `AuditLog` entry.

Rules:

- Disabled models remain selectable only by admin metadata, while deleted models disappear from historical metadata.
- Only enabled models appear in the normal chat model selector.

## AuditLog

Records security-relevant admin actions and system changes.

Fields:

- `id`: primary key.
- `actorUserId`: foreign key to `User.id`.
- `action`: string action name.
- `entityType`: affected entity type.
- `entityId`: affected entity id.
- `metadata`: JSON metadata.
- `createdAt`: timestamp.

Rules:

- Audit metadata must not include plaintext API keys.
- Audit metadata must not include full prompts.
- Audit metadata must not include uploaded file contents.
- Provider/model create, update, disable, hard delete, API key update, and default model changes must be audited.

## Cross-Model Constraints

- Every protected entity has an owner or is admin-only metadata.
- `Conversation.userId`, `FileAsset.ownerId`, `Run.userId`, and `Artifact.ownerId` are the primary ownership boundaries.
- `ProviderConfig` and `ModelConfig` are admin-managed global metadata.
- Provider/model historical references remain resolvable after disable, but may become `null` after hard delete.
- Soft delete records are excluded from normal user lists and from new retrieval or download operations.
