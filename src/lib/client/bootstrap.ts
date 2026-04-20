"use client";

export type BootstrapPhase = "idle" | "loading" | "retrying" | "ready" | "failed";

export class BootstrapRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BootstrapRequestError";
    this.status = status;
  }
}

function fallbackHttpMessage(status: number) {
  if (status === 401) {
    return "登入已失效，請重新登入。";
  }

  if (status === 403) {
    return "你沒有權限讀取這項資料。";
  }

  if (status >= 500) {
    return "服務尚未就緒。";
  }

  return `HTTP ${status}`;
}

export async function fetchJsonNoStore<T>(input: string, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new BootstrapRequestError(response.status, detail || fallbackHttpMessage(response.status));
  }

  return (await response.json()) as T;
}

export function describeBootstrapError(error: unknown) {
  if (error instanceof BootstrapRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed || "未知錯誤。";
  }

  return "未知錯誤。";
}

export function shouldRetryBootstrapError(error: unknown) {
  return !(error instanceof BootstrapRequestError && [401, 403].includes(error.status));
}

export function bootstrapRetryDelayMs(attempt: number) {
  return Math.min(4000, 600 * 2 ** Math.max(0, attempt - 1));
}
