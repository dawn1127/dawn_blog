CREATE TYPE "UserRole" AS ENUM ('admin', 'user');
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant', 'system', 'tool');
CREATE TYPE "MessageStatus" AS ENUM ('streaming', 'completed', 'failed');
CREATE TYPE "ParseStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed');
CREATE TYPE "ApiStyle" AS ENUM ('openai_compatible');
CREATE TYPE "ArtifactType" AS ENUM ('markdown', 'json');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "login" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL DEFAULT 'network-engineer',
  "title" TEXT NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "defaultProviderId" TEXT,
  "defaultModelConfigId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "status" "MessageStatus" NOT NULL DEFAULT 'completed',
  "content" TEXT NOT NULL,
  "providerId" TEXT,
  "modelConfigId" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FileAsset" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "parseStatus" "ParseStatus" NOT NULL DEFAULT 'queued',
  "parseAttempts" INTEGER NOT NULL DEFAULT 0,
  "parseError" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FileAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FileIndex" (
  "id" TEXT NOT NULL,
  "fileAssetId" TEXT NOT NULL,
  "sheetSummaries" JSONB NOT NULL,
  "columnSummaries" JSONB NOT NULL,
  "sampleRows" JSONB NOT NULL,
  "chunks" JSONB NOT NULL,
  "deterministicFindings" JSONB,
  "embeddingStatus" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FileIndex_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Run" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "toolId" TEXT NOT NULL,
  "conversationId" TEXT,
  "messageId" TEXT,
  "providerId" TEXT,
  "modelConfigId" TEXT,
  "status" "RunStatus" NOT NULL DEFAULT 'queued',
  "inputFileIds" JSONB,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Artifact" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "ArtifactType" NOT NULL,
  "storageKey" TEXT,
  "inlineContent" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProviderConfig" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseUrl" TEXT NOT NULL,
  "apiStyle" "ApiStyle" NOT NULL DEFAULT 'openai_compatible',
  "apiKeyEncrypted" TEXT NOT NULL,
  "apiKeyMasked" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModelConfig" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "supportsStreaming" BOOLEAN NOT NULL DEFAULT true,
  "supportsEmbeddings" BOOLEAN NOT NULL DEFAULT false,
  "supportsFiles" BOOLEAN NOT NULL DEFAULT false,
  "supportsJsonMode" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "maxInputTokens" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ModelConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadata" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_login_key" ON "User"("login");
CREATE INDEX "Conversation_userId_deletedAt_lastMessageAt_idx" ON "Conversation"("userId", "deletedAt", "lastMessageAt");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE UNIQUE INDEX "FileAsset_storageKey_key" ON "FileAsset"("storageKey");
CREATE INDEX "FileAsset_ownerId_deletedAt_parseStatus_idx" ON "FileAsset"("ownerId", "deletedAt", "parseStatus");
CREATE UNIQUE INDEX "FileIndex_fileAssetId_key" ON "FileIndex"("fileAssetId");
CREATE INDEX "Run_userId_status_createdAt_idx" ON "Run"("userId", "status", "createdAt");
CREATE INDEX "Artifact_ownerId_deletedAt_createdAt_idx" ON "Artifact"("ownerId", "deletedAt", "createdAt");
CREATE UNIQUE INDEX "ProviderConfig_name_key" ON "ProviderConfig"("name");
CREATE UNIQUE INDEX "ModelConfig_providerId_modelId_key" ON "ModelConfig"("providerId", "modelId");
CREATE INDEX "ModelConfig_providerId_enabled_sortOrder_idx" ON "ModelConfig"("providerId", "enabled", "sortOrder");
CREATE UNIQUE INDEX "ModelConfig_single_default_per_provider_idx" ON "ModelConfig"("providerId") WHERE "isDefault" = true;
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_defaultProviderId_fkey" FOREIGN KEY ("defaultProviderId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_defaultModelConfigId_fkey" FOREIGN KEY ("defaultModelConfigId") REFERENCES "ModelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "ModelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FileAsset" ADD CONSTRAINT "FileAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileIndex" ADD CONSTRAINT "FileIndex_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Run" ADD CONSTRAINT "Run_modelConfigId_fkey" FOREIGN KEY ("modelConfigId") REFERENCES "ModelConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModelConfig" ADD CONSTRAINT "ModelConfig_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
