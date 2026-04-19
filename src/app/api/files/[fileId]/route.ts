import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { removeStoredObjectsBestEffort } from "@/lib/files/storage-cleanup";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileId } = await context.params;
  const file = await getDb().fileAsset.findFirst({
    where: {
      id: fileId,
      ownerId: user.id,
      deletedAt: null,
    },
    select: { id: true, storageKey: true },
  });

  if (!file) {
    return new Response("File not found", { status: 404 });
  }

  const activeReferences = await getDb().messageAttachment.count({
    where: {
      fileAssetId: file.id,
      message: {
        conversation: {
          userId: user.id,
          deletedAt: null,
        },
      },
    },
  });

  if (activeReferences > 0) {
    return new Response("File is still used by active conversations", { status: 409 });
  }

  await getDb().fileAsset.update({
    where: { id: file.id },
    data: { deletedAt: new Date() },
  });

  await removeStoredObjectsBestEffort([file]);

  return Response.json({ ok: true });
}
