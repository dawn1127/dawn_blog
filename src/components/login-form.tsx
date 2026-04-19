"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResponseBody = {
  ok?: boolean;
  code?: string;
  message?: string;
  retryAfterSeconds?: number;
};

export function LoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockedUntilMs, setLockedUntilMs] = useState<number | null>(null);
  const [lockClockMs, setLockClockMs] = useState(() => Date.now());

  const remainingLockSeconds =
    lockedUntilMs === null ? 0 : Math.max(0, Math.ceil((lockedUntilMs - lockClockMs) / 1000));

  useEffect(() => {
    if (!lockedUntilMs) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const nowMs = Date.now();
      setLockClockMs(nowMs);
      if (nowMs >= lockedUntilMs) {
        setLockedUntilMs(null);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [lockedUntilMs]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (remainingLockSeconds > 0) {
      setError(`尝试次数过多，请在 ${remainingLockSeconds} 秒后再试。`);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as LoginResponseBody;

      if (!response.ok) {
        if (response.status === 429 && payload.code === "login_locked") {
          const retryAfterSeconds = Math.max(1, Number(payload.retryAfterSeconds) || 0);
          setLockClockMs(Date.now());
          setLockedUntilMs(Date.now() + retryAfterSeconds * 1000);
          setError(`尝试次数过多，请在 ${retryAfterSeconds} 秒后再试。`);
          return;
        }

        setError("账号或密码错误。");
        return;
      }

      setLockedUntilMs(null);
      router.push("/");
      router.refresh();
    } catch {
      setError("暂时无法登录，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={onSubmit}>
      <label className="field">
        <span>账号</span>
        <input value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" />
      </label>
      <label className="field">
        <span>密码</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
        />
      </label>
      {error ? <div className="status-line">{error}</div> : null}
      <button className="button" disabled={isSubmitting || remainingLockSeconds > 0} type="submit">
        {isSubmitting ? "登录中..." : "登录"}
      </button>
    </form>
  );
}
