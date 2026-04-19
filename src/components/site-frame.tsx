"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  appVersionLabel,
  getActiveSiteNavId,
  getBreadcrumbItems,
  getSettingsHref,
  siteNavItems,
} from "@/lib/network-navigation";

type AuthUser = {
  id: string;
  login: string;
  displayName: string;
  role: "admin" | "user";
};

type SessionResponse = {
  authenticated: boolean;
  refreshThrottleSeconds: number;
  timeoutSeconds: number;
  user?: AuthUser;
};

const defaultTimeoutMs = 10 * 60 * 1000;
const defaultRefreshThrottleMs = 60 * 1000;
const activityBroadcastThrottleMs = 1000;
const lastActivityKey = "network_ai_last_activity_at";
const logoutAtKey = "network_ai_logout_at";
const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "touchmove", "paste", "dragstart", "drop"];

function readStoredTimestamp(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(key);
  const timestamp = value ? Number(value) : Number.NaN;

  return Number.isFinite(timestamp) ? timestamp : null;
}

function writeStoredTimestamp(key: string, timestamp: number) {
  try {
    window.localStorage.setItem(key, String(timestamp));
  } catch {
    // Ignore private-mode and quota failures. The current tab still tracks its own timer.
  }
}

export function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const activeSiteNavId = getActiveSiteNavId(pathname);
  const isSettingsActive = pathname === "/settings";
  const breadcrumbItems = getBreadcrumbItems(pathname);
  const timeoutMsRef = useRef(defaultTimeoutMs);
  const refreshThrottleMsRef = useRef(defaultRefreshThrottleMs);
  const lastActivityAtRef = useRef(0);
  const lastActivityBroadcastAtRef = useRef(0);
  const lastRefreshAtRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const isLoggingOutRef = useRef(false);
  const authUserRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);

  const redirectToLogin = useCallback(
    (reason: "manual" | "sync" | "timeout") => {
      const target = reason === "timeout" ? "/login?reason=timeout" : "/login";

      setIsMenuOpen(false);
      setAuthUser(null);
      authUserRef.current = null;

      if (pathname !== target) {
        router.replace(target);
      }

      router.refresh();
    },
    [pathname, router],
  );

  const refreshSession = useCallback(async () => {
    if (!authUserRef.current || isRefreshingRef.current || isLoggingOutRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        cache: "no-store",
      });

      if (!response.ok) {
        redirectToLogin("timeout");
        return;
      }

      const data = (await response.json()) as SessionResponse;
      lastRefreshAtRef.current = Date.now();
      timeoutMsRef.current = data.timeoutSeconds * 1000;
      refreshThrottleMsRef.current = data.refreshThrottleSeconds * 1000;
      setAuthUser(data.user ?? null);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [redirectToLogin]);

  const broadcastLogout = useCallback((reason: "manual" | "timeout") => {
    try {
      window.localStorage.setItem(logoutAtKey, JSON.stringify({ at: Date.now(), reason }));
    } catch {
      // Cross-tab sync is best effort.
    }
  }, []);

  const logout = useCallback(
    async (reason: "manual" | "timeout") => {
      if (isLoggingOutRef.current) {
        return;
      }

      isLoggingOutRef.current = true;

      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        });
      } finally {
        broadcastLogout(reason);
        isLoggingOutRef.current = false;
        redirectToLogin(reason);
      }
    },
    [broadcastLogout, redirectToLogin],
  );

  const recordActivity = useCallback(() => {
    if (!authUserRef.current || isLoggingOutRef.current) {
      return;
    }

    const now = Date.now();
    lastActivityAtRef.current = now;

    if (now - lastActivityBroadcastAtRef.current >= activityBroadcastThrottleMs) {
      lastActivityBroadcastAtRef.current = now;
      writeStoredTimestamp(lastActivityKey, now);
    }

    if (now - lastRefreshAtRef.current >= refreshThrottleMsRef.current) {
      void refreshSession();
    }
  }, [refreshSession]);

  const checkIdleTimeout = useCallback(() => {
    if (!authUserRef.current || isLoggingOutRef.current) {
      return;
    }

    if (Date.now() - lastActivityAtRef.current >= timeoutMsRef.current) {
      void logout("timeout");
    }
  }, [logout]);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await response.json()) as SessionResponse;

        if (cancelled) {
          return;
        }

        timeoutMsRef.current = data.timeoutSeconds * 1000;
        refreshThrottleMsRef.current = data.refreshThrottleSeconds * 1000;

        if (!data.authenticated || !data.user) {
          setAuthUser(null);
          authUserRef.current = null;
          return;
        }

        const now = Date.now();
        const storedLastActivity = readStoredTimestamp(lastActivityKey);
        const nextLastActivity = Math.max(storedLastActivity ?? 0, now);

        setAuthUser(data.user);
        authUserRef.current = data.user;
        lastActivityAtRef.current = nextLastActivity;
        lastRefreshAtRef.current = 0;
        writeStoredTimestamp(lastActivityKey, nextLastActivity);
        void refreshSession();
      } catch {
        if (!cancelled) {
          setAuthUser(null);
          authUserRef.current = null;
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [pathname, refreshSession]);

  useEffect(() => {
    const onActivity = () => recordActivity();
    const onVisibilityOrFocus = () => {
      checkIdleTimeout();

      if (document.visibilityState !== "hidden") {
        recordActivity();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === lastActivityKey && event.newValue) {
        const timestamp = Number(event.newValue);

        if (Number.isFinite(timestamp) && timestamp > lastActivityAtRef.current) {
          lastActivityAtRef.current = timestamp;
        }
      }

      if (event.key === logoutAtKey && event.newValue) {
        redirectToLogin("sync");
      }
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true });
    });
    window.addEventListener("focus", onVisibilityOrFocus);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityOrFocus);

    const interval = window.setInterval(checkIdleTimeout, 15 * 1000);

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity);
      });
      window.removeEventListener("focus", onVisibilityOrFocus);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityOrFocus);
      window.clearInterval(interval);
    };
  }, [checkIdleTimeout, recordActivity, redirectToLogin]);

  return (
    <div className="site-frame">
      <header className="site-topbar">
        <Link className="site-brand" href="/" onClick={() => setIsMenuOpen(false)}>
          <span className="site-brand-mark">D</span>
          <span className="site-brand-copy">
            <strong>Dawn Workspace</strong>
            <small>v{appVersionLabel}</small>
          </span>
        </Link>

        <button
          aria-controls="site-primary-nav"
          aria-expanded={isMenuOpen}
          className="site-menu-button"
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          Menu
        </button>

        <nav
          aria-label="主板塊導航"
          className={`site-nav ${isMenuOpen ? "open" : ""}`}
          id="site-primary-nav"
        >
          {siteNavItems.map((item) => (
            <Link
              aria-current={activeSiteNavId === item.id ? "page" : undefined}
              className={`site-nav-link ${activeSiteNavId === item.id ? "active" : ""}`}
              href={item.href}
              key={item.id}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {authUser ? (
            <>
            <Link
              aria-current={isSettingsActive ? "page" : undefined}
              className={`site-nav-link ${isSettingsActive ? "active" : ""}`}
              href={getSettingsHref(authUser.role === "admin")}
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            <button className="site-logout-button" onClick={() => void logout("manual")} type="button">
              登出
            </button>
            </>
          ) : null}
        </nav>
      </header>

      {breadcrumbItems.length > 0 ? (
        <nav aria-label="目前位置" className="site-breadcrumb">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;

            return (
              <span className="breadcrumb-item" key={`${item.href}-${index}`}>
                {isLast ? (
                  <span aria-current="page">{item.label}</span>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </span>
            );
          })}
        </nav>
      ) : null}

      <div className="site-frame-content">{children}</div>
    </div>
  );
}
