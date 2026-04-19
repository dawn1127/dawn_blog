import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getProviderAdapter } from "@/lib/provider";
import { decryptSecret } from "@/lib/security/crypto";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  _request: Request,
  context: { params: Promise<{ modelId: string }> },
) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const { modelId } = await context.params;
  const model = await getDb().modelConfig.findUnique({
    where: { id: modelId },
    include: { provider: true },
  });

  if (!model) {
    return new Response("Model not found", { status: 404 });
  }

  const adapter = getProviderAdapter(model.provider.apiStyle);
  const result = await adapter.validateConnection({
    baseUrl: model.provider.baseUrl,
    apiKey: decryptSecret(model.provider.apiKeyEncrypted),
    modelId: model.modelId,
    messages: [{ role: "user", content: "Reply with OK." }],
    supportsStreaming: model.supportsStreaming,
    timeoutMs: 10000,
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "model.validate",
    entityType: "ModelConfig",
    entityId: model.id,
    metadata: {
      ok: result.ok,
      checks: result.checks,
      error: result.error,
    },
  });

  return Response.json(result);
}
