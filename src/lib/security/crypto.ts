import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/env";

const algorithm = "aes-256-gcm";

function getKey() {
  return createHash("sha256").update(getEnv().APP_ENCRYPTION_KEY).digest();
}

export function encryptSecret(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string) {
  const [ivBase64, tagBase64, encryptedBase64] = payload.split(".");

  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error("Invalid encrypted secret payload.");
  }

  const decipher = createDecipheriv(algorithm, getKey(), Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function maskSecret(secret: string) {
  if (secret.length <= 8) {
    return "****";
  }

  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}
