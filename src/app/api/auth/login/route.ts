import bcrypt from "bcryptjs";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import {
  clearLoginFailures,
  inspectLoginLockout,
  normalizeLoginForLockout,
  normalizeLoginForLookup,
  recordLoginFailure,
} from "@/lib/auth/login-lockout";

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
});

const dummyPasswordHash = bcrypt.hashSync("network-engineer-login-dummy-password", 12);

function invalidCredentialsResponse() {
  return Response.json(
    {
      ok: false,
      code: "invalid_credentials",
      message: "Invalid login or password.",
    },
    { status: 401 },
  );
}

function loginLockedResponse(retryAfterSeconds: number) {
  const headers = new Headers({
    "Retry-After": String(retryAfterSeconds),
  });

  return Response.json(
    {
      ok: false,
      code: "login_locked",
      message: "Too many failed sign-in attempts. Try again later.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers,
    },
  );
}

export async function POST(request: Request) {
  const body = loginSchema.parse(await request.json());
  const lookupLogin = normalizeLoginForLookup(body.login);
  const lockoutLogin = normalizeLoginForLockout(body.login);
  const lockoutStatus = await inspectLoginLockout(lockoutLogin);

  if (lockoutStatus.locked) {
    return loginLockedResponse(lockoutStatus.retryAfterSeconds);
  }

  const user = await getDb().user.findFirst({
    where: {
      login: lookupLogin,
      enabled: true,
    },
  });

  const passwordHash = user?.passwordHash ?? dummyPasswordHash;
  const ok = await bcrypt.compare(body.password, passwordHash);

  if (!user) {
    const failure = await recordLoginFailure(lockoutLogin);
    if (failure.retryAfterSeconds > 0) {
      return loginLockedResponse(failure.retryAfterSeconds);
    }
    return invalidCredentialsResponse();
  }

  if (!ok) {
    const failure = await recordLoginFailure(lockoutLogin);
    if (failure.retryAfterSeconds > 0) {
      return loginLockedResponse(failure.retryAfterSeconds);
    }
    return invalidCredentialsResponse();
  }

  await clearLoginFailures(lockoutLogin);
  await setSessionCookie(await createSession(user.id));
  return Response.json({ ok: true });
}
