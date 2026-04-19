CREATE TYPE "FileAssetKind" AS ENUM ('spreadsheet', 'image');

ALTER TABLE "FileAsset" ADD COLUMN "kind" "FileAssetKind" NOT NULL DEFAULT 'spreadsheet';
ALTER TABLE "ModelConfig" ADD COLUMN "supportsImages" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Conversation" ADD COLUMN "folderId" TEXT;

CREATE TABLE "ConversationFolder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConversationFolder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessageAttachment" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "fileAssetId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Conversation_folderId_lastMessageAt_idx" ON "Conversation"("folderId", "lastMessageAt");
CREATE INDEX "ConversationFolder_userId_deletedAt_sortOrder_idx" ON "ConversationFolder"("userId", "deletedAt", "sortOrder");
CREATE UNIQUE INDEX "MessageAttachment_messageId_fileAssetId_key" ON "MessageAttachment"("messageId", "fileAssetId");
CREATE INDEX "MessageAttachment_messageId_sortOrder_idx" ON "MessageAttachment"("messageId", "sortOrder");
CREATE INDEX "MessageAttachment_fileAssetId_idx" ON "MessageAttachment"("fileAssetId");

ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ConversationFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConversationFolder" ADD CONSTRAINT "ConversationFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_fileAssetId_fkey" FOREIGN KEY ("fileAssetId") REFERENCES "FileAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
