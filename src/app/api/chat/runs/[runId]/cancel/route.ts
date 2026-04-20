import { getCurrentUser } from "@/lib/auth/session";
import { cancelActiveChatRun } from "@/lib/chat/active-runs";
import { getDb } from "@/lib/db";

const canceledReplyMessage = "已停止回覆";

function appendCanceledMessage(content: string) {
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${canceledReplyMessage}` : canceledReplyMessage;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { runId } = await context.params;
  const db = getDb();
  const run = await db.run.findUnique({
    where: { id: runId },
    include: {
      message: {
        select: {
          id: true,
          content: true,
        },
      },
    },
  });

  if (!run) {
    return new Response("Run not found", { status: 404 });
  }

  if (run.userId !== user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  if (run.status !== "running") {
    return new Response("Run is not running", { status: 409 });
  }

  cancelActiveChatRun(run.id);

  await db.$transaction([
    db.run.update({
      where: { id: run.id },
      data: {
        status: "failed",
        errorMessage: "Canceled by user",
        completedAt: new Date(),
      },
    }),
    ...(run.message
      ? [
          db.message.update({
            where: { id: run.message.id },
            data: {
              status: "failed",
              content: appendCanceledMessage(run.message.content),
              errorMessage: "Canceled by user",
            },
          }),
        ]
      : []),
  ]);

  return Response.json({ ok: true });
}
