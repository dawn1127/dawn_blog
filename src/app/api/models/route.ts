import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const models = await getDb().modelConfig.findMany({
    where: {
      enabled: true,
      provider: {
        enabled: true,
      },
    },
    include: {
      provider: {
        select: {
          name: true,
          apiStyle: true,
        },
      },
    },
    orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { displayName: "asc" }],
  });

  return Response.json({
    models: models.map((model) => ({
      id: model.id,
      modelId: model.modelId,
      displayName: model.displayName,
      providerName: model.provider.name,
      supportsStreaming: model.supportsStreaming,
      supportsFiles: model.supportsFiles,
      supportsImages: model.supportsImages,
      supportsNativeFiles: model.supportsNativeFiles,
      providerApiStyle: model.provider.apiStyle,
    })),
  });
}
