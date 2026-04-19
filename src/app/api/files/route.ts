import { nanoid } from "nanoid";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { ensureBucket, getStorageClient } from "@/lib/storage";
import { getEnv } from "@/lib/env";
import { getDocumentMode } from "@/lib/settings";
import { getUploadKind, isNativeFileKind, mimeTypeForUpload } from "@/lib/file-types";

const maxFileSize = 50 * 1024 * 1024;
const maxImageSize = 20 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const files = await getDb().fileAsset.findMany({
    where: {
      ownerId: user.id,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json({ files });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const activeUploads = await db.fileAsset.count({
    where: {
      ownerId: user.id,
      deletedAt: null,
      parseStatus: { in: ["queued", "processing"] },
    },
  });

  if (activeUploads >= 2) {
    return new Response("Upload quota exceeded", { status: 429 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return new Response("Missing file", { status: 400 });
  }

  if (file.size <= 0) {
    return new Response("Empty file", { status: 400 });
  }

  const kind = getUploadKind(file.name, file.type);

  if (!kind) {
    return new Response("這個文件格式暫不支援。", { status: 400 });
  }

  if (isNativeFileKind(kind) && file.size > maxFileSize) {
    return new Response("文件總大小超過 50MB，請減少附件後再試。", { status: 413 });
  }

  if (kind === "image" && file.size > maxImageSize) {
    return new Response("Image exceeds 20MB limit", { status: 413 });
  }

  await ensureBucket();

  const env = getEnv();
  const storageKey = `${user.id}/${Date.now()}-${nanoid()}-${file.name}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const mimeType = mimeTypeForUpload(file.name, file.type || "application/octet-stream");

  await getStorageClient().putObject(env.S3_BUCKET, storageKey, bytes, file.size, {
    "Content-Type": mimeType,
  });

  const documentMode = await getDocumentMode();
  const parseStatus = kind === "image" || documentMode === "openai_native" ? "completed" : "queued";

  const asset = await db.fileAsset.create({
    data: {
      ownerId: user.id,
      kind,
      originalName: file.name,
      mimeType,
      sizeBytes: file.size,
      storageKey,
      parseStatus,
    },
  });

  return Response.json({ file: asset });
}
