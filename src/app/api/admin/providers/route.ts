import { ApiStyle } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { encryptSecret, maskSecret } from "@/lib/security/crypto";

const createProviderSchema = z.object({
  name: z.string().min(1),
  baseUrl: z.string().url(),
  apiStyle: z
    .enum(["openai_compatible", "openai_responses", "anthropic_messages"])
    .default("openai_compatible"),
  apiKey: z.string().min(1),
  enabled: z.boolean().default(true),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const providers = await getDb().providerConfig.findMany({
    include: {
      models: {
        orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return Response.json({
    providers: providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      apiStyle: provider.apiStyle,
      apiKeyMasked: provider.apiKeyMasked,
      enabled: provider.enabled,
      models: provider.models,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const body = createProviderSchema.parse(await request.json());
  const provider = await getDb().providerConfig.create({
    data: {
      name: body.name,
      baseUrl: body.baseUrl,
      apiStyle: body.apiStyle as ApiStyle,
      apiKeyEncrypted: encryptSecret(body.apiKey),
      apiKeyMasked: maskSecret(body.apiKey),
      enabled: body.enabled,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    action: "provider.create",
    entityType: "ProviderConfig",
    entityId: provider.id,
    metadata: {
      name: provider.name,
      baseUrl: provider.baseUrl,
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
