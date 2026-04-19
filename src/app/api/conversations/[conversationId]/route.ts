import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { removeStoredObjectsBestEffort } from "@/lib/files/storage-cleanup";
import { z } from "zod";

const updateConversationSchema = z.object({
  folderId: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId } = await context.params;
  const body = updateConversationSchema.parse(await request.json());
  const db = getDb();
  const conversation = await db.conversation.findFirst({
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

  if (body.folderId) {
    const folder = await db.conversationFolder.findFirst({
      where: {
        id: body.folderId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!folder) {
      return new Response("Project not found", { status: 404 });
    }
  }

  const updated = await db.conversation.update({
    where: { id: conversation.id },
    data: {
      folderId: body.folderId ?? null,
    },
    select: {
      id: true,
      folderId: true,
      title: true,
      lastMessageAt: true,
      createdAt: true,
    },
  });

  return Response.json({ conversation: updated });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ conversationId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { conversationId } = await context.params;
  const db = getDb();
  const now = new Date();
  const filesToRemove = await db.$transaction(async (tx) => {
    const conversation = await tx.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!conversation) {
      return null;
    }

    const attachments = await tx.messageAttachment.findMany({
      where: {
        message: {
          conversationId: conversation.id,
        },
      },
      select: {
        fileAssetId: true,
      },
    });
    const attachedFileIds = Array.from(new Set(attachments.map((attachment) => attachment.fileAssetId)));

    await tx.conversation.update({
      where: { id: conversation.id },
      data: { deletedAt: now },
    });

    if (attachedFileIds.length === 0) {
      return [];
    }

    const activeReferences = await tx.messageAttachment.findMany({
      where: {
        fileAssetId: { in: attachedFileIds },
        message: {
          conversation: {
            userId: user.id,
            deletedAt: null,
          },
        },
      },
      select: {
        fileAssetId: true,
      },
    });
    const stillReferencedFileIds = new Set(activeReferences.map((reference) => reference.fileAssetId));
    const unreferencedFileIds = attachedFileIds.filter((fileId) => !stillReferencedFileIds.has(fileId));

    if (unreferencedFileIds.length === 0) {
      return [];
    }

    const files = await tx.fileAsset.findMany({
      where: {
        id: { in: unreferencedFileIds },
        ownerId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    if (files.length > 0) {
      await tx.fileAsset.updateMany({
        where: {
          id: { in: files.map((file) => file.id) },
          ownerId: user.id,
          deletedAt: null,
        },
        data: { deletedAt: now },
      });
    }

    return files;
  });

  if (!filesToRemove) {
    return new Response("Conversation not found", { status: 404 });
  }

  await removeStoredObjectsBestEffort(filesToRemove);

  return Response.json({ ok: true });
}
