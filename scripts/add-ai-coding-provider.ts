import "../src/lib/load-dotenv";

import { ApiStyle } from "@prisma/client";
import { getDb } from "../src/lib/db";
import { encryptSecret, maskSecret } from "../src/lib/security/crypto";

const providerName = "AI Coding 2233 Responses";
const baseUrl = "https://aicoding.2233.ai";
const modelId = "gpt-5.4";

async function main() {
  const apiKey = process.env.AICODING_API_KEY;

  if (!apiKey) {
    throw new Error("AICODING_API_KEY is required.");
  }

  const db = getDb();
  const provider = await db.providerConfig.upsert({
    where: { name: providerName },
    update: {
      baseUrl,
      apiStyle: ApiStyle.openai_responses,
      apiKeyEncrypted: encryptSecret(apiKey),
      apiKeyMasked: maskSecret(apiKey),
      enabled: true,
    },
    create: {
      name: providerName,
      baseUrl,
      apiStyle: ApiStyle.openai_responses,
      apiKeyEncrypted: encryptSecret(apiKey),
      apiKeyMasked: maskSecret(apiKey),
      enabled: true,
    },
  });

  await db.modelConfig.updateMany({
    where: { providerId: provider.id },
    data: { isDefault: false },
  });

  const model = await db.modelConfig.upsert({
    where: {
      providerId_modelId: {
        providerId: provider.id,
        modelId,
      },
    },
    update: {
      displayName: "GPT-5.4 (AI Coding)",
      supportsStreaming: true,
      supportsEmbeddings: false,
      supportsFiles: true,
      supportsJsonMode: false,
      enabled: true,
      isDefault: true,
      sortOrder: 10,
      notes: "AI Coding 2233 relay via OpenAI Responses API.",
    },
    create: {
      providerId: provider.id,
      modelId,
      displayName: "GPT-5.4 (AI Coding)",
      supportsStreaming: true,
      supportsEmbeddings: false,
      supportsFiles: true,
      supportsJsonMode: false,
      enabled: true,
      isDefault: true,
      sortOrder: 10,
      notes: "AI Coding 2233 relay via OpenAI Responses API.",
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: {
          id: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiStyle: provider.apiStyle,
          apiKeyMasked: provider.apiKeyMasked,
        },
        model: {
          id: model.id,
          modelId: model.modelId,
          displayName: model.displayName,
          isDefault: model.isDefault,
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await getDb().$disconnect();
  });
