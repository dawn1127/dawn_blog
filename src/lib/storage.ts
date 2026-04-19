import { Client } from "minio";
import { getEnv } from "@/lib/env";

const globalForMinio = globalThis as unknown as {
  minio?: Client;
};

export function getStorageClient() {
  if (!globalForMinio.minio) {
    const env = getEnv();
    globalForMinio.minio = new Client({
      endPoint: env.S3_ENDPOINT,
      port: env.S3_PORT,
      useSSL: env.S3_USE_SSL,
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
    });
  }

  return globalForMinio.minio;
}

export async function ensureBucket() {
  const env = getEnv();
  const client = getStorageClient();
  const exists = await client.bucketExists(env.S3_BUCKET);

  if (!exists) {
    await client.makeBucket(env.S3_BUCKET);
  }
}
