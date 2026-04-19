import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";

const updateModelSchema = z.object({
  modelId: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  supportsStreaming: z.boolean().optional(),
  supportsEmbeddings: z.boolean().optional(),
  supportsFiles: z.boolean().optional(),
  supportsImages: z.boolean().optional(),
  supportsNativeFiles: z.boolean().optional(),
  supportsJsonMode: z.boolean().optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  maxInputTokens: z.number().int().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ modelId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { modelId } = await context.params;
  const body = updateModelSchema.parse(await request.json());
  const db = getDb();
  const existing = await db.modelConfig.findUnique({ where: { id: modelId } });

  if (!existing) {
    return new Response("Model not found", { status: 404 });
  }

  const model = await db.$transaction(async (tx) => {
    if (body.isDefault) {
      await tx.modelConfig.updateMany({
        where: { providerId: existing.providerId },
        data: { isDefault: false },
      });
    }

    return tx.modelConfig.update({
      where: { id: modelId },
      data: body,
    });
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "model.update",
    entityType: "ModelConfig",
    entityId: model.id,
    metadata: {
      changedFields: Object.keys(body),
      enabled: model.enabled,
      isDefault: model.isDefault,
    },
  });

  return Response.json({ model });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ modelId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { modelId } = await context.params;
  const db = getDb();
  const model = await db.modelConfig.findUnique({
    where: { id: modelId },
    include: {
      provider: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  const [conversationRefs, messageRefs, runRefs] = await Promise.all([
    db.conversation.count({ where: { defaultModelConfigId: modelId } }),
    db.message.count({ where: { modelConfigId: modelId } }),
    db.run.count({ where: { modelConfigId: modelId } }),
  ]);

  await db.$transaction(async (tx) => {
    await tx.modelConfig.delete({ where: { id: modelId } });
    await tx.auditLog.create({
      data: {
        actorUserId: user.id,
        action: "model.delete",
        entityType: "ModelConfig",
        entityId: model.id,
        metadata: {
          providerId: model.providerId,
          providerName: model.provider.name,
          modelId: model.modelId,
          displayName: model.displayName,
          detachedReferences: {
            conversations: conversationRefs,
            messages: messageRefs,
            runs: runRefs,
          },
        },
      },
    });
  });

  return Response.json({ ok: true });
}
