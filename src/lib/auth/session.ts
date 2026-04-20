import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db";
import {
  createSessionToken,
  sessionCookieName,
  sessionIdleTimeoutSeconds,
  verifySessionToken,
} from "@/lib/auth/session-token";

export { sessionIdleTimeoutSeconds, sessionRefreshThrottleSeconds } from "@/lib/auth/session-token";

async function shouldUseSecureSessionCookie() {
  const headerStore = await headers();
  return headerStore.get("x-forwarded-proto") === "https";
}

export async function createSession(userId: string) {
  return createSessionToken(userId);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: await shouldUseSecureSessionCookie(),
    path: "/",
    maxAge: sessionIdleTimeoutSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await verifySessionToken(token);

  if (!session) {
    return null;
  }

  return getDb().user.findFirst({
    where: {
      id: session.userId,
      enabled: true,
    },
    select: {
      id: true,
      login: true,
      displayName: true,
      role: true,
    },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }

  return user;
}
