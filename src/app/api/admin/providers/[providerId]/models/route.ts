import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";

const createModelSchema = z.object({
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  supportsStreaming: z.boolean().default(true),
  supportsEmbeddings: z.boolean().default(false),
  supportsFiles: z.boolean().default(false),
  supportsImages: z.boolean().default(false),
  supportsNativeFiles: z.boolean().default(false),
  supportsJsonMode: z.boolean().default(false),
  enabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  maxInputTokens: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { providerId } = await context.params;
  const body = createModelSchema.parse(await request.json());
  const db = getDb();

  const provider = await db.providerConfig.findUnique({ where: { id: providerId } });

  if (!provider) {
    return new Response("Provider not found", { status: 404 });
  }

  const model = await db.$transaction(async (tx) => {
    if (body.isDefault) {
      await tx.modelConfig.updateMany({
        where: { providerId },
        data: { isDefault: false },
      });
    }

    return tx.modelConfig.create({
      data: {
        providerId,
        modelId: body.modelId,
        displayName: body.displayName,
        supportsStreaming: body.supportsStreaming,
        supportsEmbeddings: body.supportsEmbeddings,
        supportsFiles: body.supportsFiles,
        supportsImages: body.supportsImages,
        supportsNativeFiles: body.supportsNativeFiles,
        supportsJsonMode: body.supportsJsonMode,
        enabled: body.enabled,
        isDefault: body.isDefault,
        sortOrder: body.sortOrder,
        maxInputTokens: body.maxInputTokens,
        notes: body.notes,
      },
    });
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "model.create",
    entityType: "ModelConfig",
    entityId: model.id,
    metadata: {
      providerId,
      modelId: model.modelId,
      enabled: model.enabled,
      isDefault: model.isDefault,
    },
  });

  return Response.json({ model });
}
