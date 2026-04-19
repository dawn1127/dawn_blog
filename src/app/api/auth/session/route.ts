import { getCurrentUser, sessionIdleTimeoutSeconds, sessionRefreshThrottleSeconds } from "@/lib/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return Response.json({
      authenticated: false,
      timeoutSeconds: sessionIdleTimeoutSeconds,
      refreshThrottleSeconds: sessionRefreshThrottleSeconds,
    });
  }

  return Response.json({
    authenticated: true,
    user,
    timeoutSeconds: sessionIdleTimeoutSeconds,
    refreshThrottleSeconds: sessionRefreshThrottleSeconds,
  });
}

