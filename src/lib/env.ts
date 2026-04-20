import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  APP_ENCRYPTION_KEY: z.string().min(16),
  SESSION_SECRET: z.string().min(16),
  S3_ENDPOINT: z.string().default("localhost"),
  S3_PORT: z.coerce.number().default(9000),
  S3_USE_SSL: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("network-engineer-ai"),
});

const sessionSecretSchema = z.string().min(16);

export function getEnv() {
  return envSchema.parse(process.env);
}

export function getSessionSecret() {
  return sessionSecretSchema.parse(process.env.SESSION_SECRET);
}
