import {
  createSession,
  getCurrentUser,
  sessionIdleTimeoutSeconds,
  sessionRefreshThrottleSeconds,
  setSessionCookie,
} from "@/lib/auth/session";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await setSessionCookie(await createSession(user.id));

  return Response.json({
    ok: true,
    user,
    timeoutSeconds: sessionIdleTimeoutSeconds,
    refreshThrottleSeconds: sessionRefreshThrottleSeconds,
  });
}

