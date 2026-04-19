import { getCurrentUser } from "@/lib/auth/session";
import { contentDispositionAttachment } from "@/lib/files/download-response";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getStorageClient } from "@/lib/storage";
import { streamToBuffer } from "@/lib/storage/read-object";

export async function GET(
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
  });

  if (!file) {
    return new Response("File not found", { status: 404 });
  }

  const objectStream = await getStorageClient().getObject(getEnv().S3_BUCKET, file.storageKey);
  const bytes = await streamToBuffer(objectStream);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": contentDispositionAttachment(file.originalName),
      "Cache-Control": "private, max-age=300",
    },
  });
}

