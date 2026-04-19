import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

const updateFolderSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ folderId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { folderId } = await context.params;
  const body = updateFolderSchema.parse(await request.json());
  const folder = await getDb().conversationFolder.findFirst({
    where: {
      id: folderId,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!folder) {
    return new Response("Project not found", { status: 404 });
  }

  const updated = await getDb().conversationFolder.update({
    where: { id: folder.id },
    data: body,
  });

  return Response.json({ folder: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ folderId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { folderId } = await context.params;
  const db = getDb();
  const folder = await db.conversationFolder.findFirst({
    where: {
      id: folderId,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!folder) {
    return new Response("Project not found", { status: 404 });
  }

  await db.$transaction([
    db.conversation.updateMany({
      where: {
        userId: user.id,
        folderId: folder.id,
      },
      data: { folderId: null },
    }),
    db.conversationFolder.update({
      where: { id: folder.id },
      data: { deletedAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
