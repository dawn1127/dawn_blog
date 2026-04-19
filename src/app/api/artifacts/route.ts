import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const createArtifactSchema = z.object({
  runId: z.string().min(1),
  title: z.string().min(1).max(160),
  type: z.enum(["markdown", "json"]).default("markdown"),
  inlineContent: z.string().min(1),
});

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const artifacts = await getDb().artifact.findMany({
    where: {
      ownerId: user.id,
      deletedAt: null,
    },
    include: {
      run: {
        select: {
          id: true,
          toolId: true,
          conversationId: true,
          messageId: true,
          modelConfig: {
            select: {
              displayName: true,
              modelId: true,
              provider: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json({ artifacts });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = createArtifactSchema.parse(await request.json());
  const run = await getDb().run.findFirst({
    where: {
      id: body.runId,
      userId: user.id,
    },
  });

  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  const artifact = await getDb().artifact.create({
    data: {
      ownerId: user.id,
      runId: run.id,
      title: body.title,
      type: body.type,
      inlineContent: body.inlineContent,
    },
  });

  return Response.json({ artifact });
}
