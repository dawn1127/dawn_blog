"use client";

import { useEffect, useState } from "react";

type SettingsResponse = {
  documentMode: "openai_native" | "local_parse";
  canEdit: boolean;
};

export function DocumentSettings() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [status, setStatus] = useState("讀取中...");

  async function loadSettings() {
    setStatus("讀取中...");
    const response = await fetch("/api/settings", { cache: "no-store" });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    const data = (await response.json()) as SettingsResponse;
    setSettings(data);
    setStatus("已保存 OpenAI 原生文件模式。");
  }

  async function saveOpenAiNative() {
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentMode: "openai_native" }),
    });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    await loadSettings();
  }

  useEffect(() => {
    void Promise.resolve().then(loadSettings);
  }, []);

  return (
    <section className="settings-section document-settings">
      <div className="section-headline">
        <h3>文件</h3>
        <p>Chat 會把文件直接交給支援原生文件的 OpenAI Responses 模型讀取。</p>
      </div>

      <label className="settings-choice active">
        <input
          checked={settings?.documentMode === "openai_native"}
          disabled={!settings?.canEdit}
          onChange={() => void saveOpenAiNative()}
          type="radio"
        />
        <span>
          <strong>用 OpenAI 原生文件</strong>
          <small>支援 PDF、Office、spreadsheet、文字和設定檔；按送出時以 input_file 傳入模型。</small>
        </span>
      </label>

      <label className="settings-choice disabled">
        <input checked={false} disabled type="radio" />
        <span>
          <strong>本地解析優先</strong>
          <small>適合中轉 API 和本地模型，稍後支援。</small>
        </span>
      </label>

      <p className="status-line">{settings?.canEdit ? status : "只讀：只有 admin 可以更改文件模式。"}</p>
    </section>
  );
}
