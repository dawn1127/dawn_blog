import { getCurrentUser } from "@/lib/auth/session";
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

  if (file.kind !== "image") {
    return new Response("Preview is only available for image files", { status: 400 });
  }

  const objectStream = await getStorageClient().getObject(getEnv().S3_BUCKET, file.storageKey);
  const bytes = await streamToBuffer(objectStream);

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Cache-Control": "private, max-age=300",
    },
  });
}
