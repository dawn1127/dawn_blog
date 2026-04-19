ALTER TYPE "FileAssetKind" ADD VALUE IF NOT EXISTS 'document';

ALTER TABLE "ModelConfig" ADD COLUMN "supportsNativeFiles" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AppSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

INSERT INTO "AppSetting" ("key", "value", "createdAt", "updatedAt")
VALUES ('documentMode', 'openai_native', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
