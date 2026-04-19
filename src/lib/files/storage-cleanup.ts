import { getEnv } from "@/lib/env";
import { getStorageClient } from "@/lib/storage";

type StoredObject = {
  id: string;
  storageKey: string;
};

export async function removeStoredObjectsBestEffort(files: StoredObject[]) {
  const bucket = getEnv().S3_BUCKET;
  const client = getStorageClient();

  await Promise.allSettled(files.map((file) => client.removeObject(bucket, file.storageKey)));
}

