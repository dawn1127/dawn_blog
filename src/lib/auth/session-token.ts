import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/env";

export const sessionCookieName = "network_ai_session";
export const sessionIdleTimeoutSeconds = 10 * 60;
export const sessionRefreshThrottleSeconds = 60;

export type SessionPayload = {
  userId: string;
};

function getSessionKey() {
  return new TextEncoder().encode(getSessionSecret());
}

export async function createSessionToken(userId: string) {
  return new SignJWT({ userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionIdleTimeoutSeconds}s`)
    .sign(getSessionKey());
}

export async function verifySessionToken(token: string) {
  try {
    const verified = await jwtVerify<SessionPayload>(token, getSessionKey());
    const userId = String(verified.payload.userId || "");

    if (!userId) {
      return null;
    }

    return { userId };
  } catch {
    return null;
  }
}
