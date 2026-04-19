import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getRedis } from "@/lib/rate-limit";
import { getStorageClient } from "@/lib/storage";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

async function runCheck(name: string, check: () => Promise<string>): Promise<Check> {
  try {
    const detail = await check();
    return { name, ok: true, detail };
  } catch (error) {
    return {
      name,
      ok: false,
      detail: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    return new Response("Forbidden", { status: user ? 403 : 401 });
  }

  const env = getEnv();
  const db = getDb();
  const checks = await Promise.all([
    runCheck("server env", async () => {
      return [
        env.APP_ENCRYPTION_KEY ? "APP_ENCRYPTION_KEY set" : "APP_ENCRYPTION_KEY missing",
        env.SESSION_SECRET ? "SESSION_SECRET set" : "SESSION_SECRET missing",
      ].join(", ");
    }),
    runCheck("database", async () => {
      await db.$queryRaw`SELECT 1`;
      return "Postgres query OK";
    }),
    runCheck("redis", async () => {
      const pong = await getRedis().ping();
      return `Redis ${pong}`;
    }),
    runCheck("minio", async () => {
      const exists = await getStorageClient().bucketExists(env.S3_BUCKET);

      if (!exists) {
        throw new Error(`Bucket ${env.S3_BUCKET} missing`);
      }

      return `Bucket ${env.S3_BUCKET} exists`;
    }),
  ]);

  const [
    providers,
    enabledProviders,
    models,
    enabledModels,
    users,
    filesQueued,
    filesProcessing,
  ] = await Promise.all([
    db.providerConfig.count(),
    db.providerConfig.count({ where: { enabled: true } }),
    db.modelConfig.count(),
    db.modelConfig.count({ where: { enabled: true, provider: { enabled: true } } }),
    db.user.count(),
    db.fileAsset.count({ where: { parseStatus: "queued", deletedAt: null } }),
    db.fileAsset.count({ where: { parseStatus: "processing", deletedAt: null } }),
  ]);

  return Response.json({
    ok: checks.every((check) => check.ok),
    checks,
    counts: {
      providers,
      enabledProviders,
      models,
      enabledModels,
      users,
      filesQueued,
      filesProcessing,
    },
  });
}
