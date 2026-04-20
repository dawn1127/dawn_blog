import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export async function GET(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId } = await context.params;
  const conversation = await getDb().conversation.findFirst({
    where: {
      id: conversationId,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const messages = await getDb().message.findMany({
    where: {
      conversationId,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      status: true,
      providerResponseModel: true,
      errorMessage: true,
      createdAt: true,
      provider: {
        select: {
          name: true,
        },
      },
      modelConfig: {
        select: {
          modelId: true,
          displayName: true,
        },
      },
      attachments: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          fileAsset: {
            select: {
              id: true,
              kind: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              parseStatus: true,
              parseError: true,
              deletedAt: true,
            },
          },
        },
      },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  return Response.json({ messages });
}
