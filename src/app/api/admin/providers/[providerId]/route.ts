import { ApiStyle } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { encryptSecret, maskSecret } from "@/lib/security/crypto";

const updateProviderSchema = z.object({
  name: z.string().min(1).optional(),
  baseUrl: z.string().url().optional(),
  apiStyle: z.enum(["openai_compatible", "openai_responses", "anthropic_messages"]).optional(),
  apiKey: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { providerId } = await context.params;
  const body = updateProviderSchema.parse(await request.json());
  const data = {
    ...(body.name !== undefined ? { name: body.name } : {}),
    ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl } : {}),
    ...(body.apiStyle !== undefined ? { apiStyle: body.apiStyle as ApiStyle } : {}),
    ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    ...(body.apiKey !== undefined
      ? {
          apiKeyEncrypted: encryptSecret(body.apiKey),
          apiKeyMasked: maskSecret(body.apiKey),
        }
      : {}),
  };

  const provider = await getDb().providerConfig.update({
    where: { id: providerId },
    data,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "provider.update",
    entityType: "ProviderConfig",
    entityId: provider.id,
    metadata: {
      changedFields: Object.keys(data).filter((key) => key !== "apiKeyEncrypted"),
      apiKeyUpdated: body.apiKey !== undefined,
      enabled: provider.enabled,
    },
  });

  return Response.json({
    provider: {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiStyle: provider.apiStyle,
      apiKeyMasked: provider.apiKeyMasked,
      enabled: provider.enabled,
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { providerId } = await context.params;
  const db = getDb();
  const provider = await db.providerConfig.findUnique({
    where: { id: providerId },
    include: {
      models: {
        select: {
          id: true,
          modelId: true,
          displayName: true,
        },
      },
    },
  });

  if (!provider) {
    return new Response("Provider not found", { status: 404 });
  }

  const modelIds = provider.models.map((model) => model.id);
  const [
    providerConversationRefs,
    providerMessageRefs,
    providerRunRefs,
    modelConversationRefs,
    modelMessageRefs,
    modelRunRefs,
  ] = await Promise.all([
    db.conversation.count({ where: { defaultProviderId: providerId } }),
    db.message.count({ where: { providerId } }),
    db.run.count({ where: { providerId } }),
    modelIds.length > 0
      ? db.conversation.count({ where: { defaultModelConfigId: { in: modelIds } } })
      : Promise.resolve(0),
    modelIds.length > 0
      ? db.message.count({ where: { modelConfigId: { in: modelIds } } })
      : Promise.resolve(0),
    modelIds.length > 0
      ? db.run.count({ where: { modelConfigId: { in: modelIds } } })
      : Promise.resolve(0),
  ]);
  const totalRefs =
    providerConversationRefs +
    providerMessageRefs +
    providerRunRefs +
    modelConversationRefs +
    modelMessageRefs +
    modelRunRefs;

  await db.$transaction(async (tx) => {
    await tx.modelConfig.deleteMany({ where: { providerId } });
    await tx.providerConfig.delete({ where: { id: providerId } });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "provider.delete",
        entityType: "ProviderConfig",
        entityId: provider.id,
        metadata: {
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiStyle: provider.apiStyle,
          deletedModels: provider.models.map((model) => ({
            id: model.id,
            modelId: model.modelId,
            displayName: model.displayName,
          })),
          detachedReferences: {
            total: totalRefs,
            providerConversations: providerConversationRefs,
            providerMessages: providerMessageRefs,
            providerRuns: providerRunRefs,
            modelConversations: modelConversationRefs,
            modelMessages: modelMessageRefs,
            modelRuns: modelRunRefs,
          },
        },
      },
    });
  });

  return Response.json({ ok: true });
}
