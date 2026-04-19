import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ artifactId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { artifactId } = await context.params;
  const artifact = await getDb().artifact.findFirst({
    where: {
      id: artifactId,
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
          provider: { select: { name: true } },
          modelConfig: { select: { displayName: true, modelId: true } },
        },
      },
    },
  });

  if (!artifact) {
    return new Response("Artifact not found", { status: 404 });
  }

  return Response.json({ artifact });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ artifactId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { artifactId } = await context.params;
  const artifact = await getDb().artifact.findFirst({
    where: {
      id: artifactId,
      ownerId: user.id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!artifact) {
    return new Response("Artifact not found", { status: 404 });
  }

  await getDb().artifact.update({
    where: { id: artifact.id },
    data: { deletedAt: new Date() },
  });

  return Response.json({ ok: true });
}
