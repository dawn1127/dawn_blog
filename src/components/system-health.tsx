"use client";

import { useEffect, useState } from "react";

type HealthCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

type HealthResponse = {
  ok: boolean;
  checks: HealthCheck[];
  counts: {
    providers: number;
    enabledProviders: number;
    models: number;
    enabledModels: number;
    users: number;
    filesQueued: number;
    filesProcessing: number;
  };
};

export function SystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [status, setStatus] = useState("讀取中...");

  async function loadHealth() {
    setStatus("讀取中...");
    const response = await fetch("/api/admin/system/health", { cache: "no-store" });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    const data = (await response.json()) as HealthResponse;
    setHealth(data);
    setStatus(data.ok ? "全部通過" : "有項目需要處理");
  }

  useEffect(() => {
    void Promise.resolve().then(loadHealth);
  }, []);

  return (
    <div className="surface admin-panel">
      <div className="health-head">
        <div>
          <h3>{health?.ok ? "System ready" : "System check"}</h3>
          <p className="status-line">{status}</p>
        </div>
        <button className="button secondary" onClick={() => void loadHealth()} type="button">
          重新檢查
        </button>
      </div>

      <div className="health-grid">
        {health?.checks.map((check) => (
          <div className={`health-item ${check.ok ? "ok" : "fail"}`} key={check.name}>
            <strong>{check.name}</strong>
            <span>{check.ok ? "OK" : "FAIL"}</span>
            <p>{check.detail}</p>
          </div>
        ))}
      </div>

      {health ? (
        <div className="metric-grid">
          {Object.entries(health.counts).map(([key, value]) => (
            <div className="metric" key={key}>
              <strong>{value}</strong>
              <span>{key}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
