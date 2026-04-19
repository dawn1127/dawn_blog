import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";

const cookieName = "network_ai_session";
export const sessionIdleTimeoutSeconds = 10 * 60;
export const sessionRefreshThrottleSeconds = 60;

type SessionPayload = {
  userId: string;
};

function getSessionKey() {
  return new TextEncoder().encode(getEnv().SESSION_SECRET);
}

export async function createSession(userId: string) {
  return new SignJWT({ userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionIdleTimeoutSeconds}s`)
    .sign(getSessionKey());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionIdleTimeoutSeconds,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSessionKey());
    const userId = String(verified.payload.userId || "");

    if (!userId) {
      return null;
    }

    return getDb().user.findFirst({
      where: {
        id: userId,
        enabled: true,
      },
      select: {
        id: true,
        login: true,
        displayName: true,
        role: true,
      },
    });
  } catch {
    return null;
  }
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
