"use client";

import { useEffect, useState } from "react";

type Artifact = {
  id: string;
  title: string;
  type: "markdown" | "json";
  inlineContent: string | null;
  createdAt: string;
  run: {
    id: string;
    toolId: string;
    conversationId: string | null;
    messageId: string | null;
    modelConfig: {
      displayName: string;
      modelId: string;
      provider: {
        name: string;
      };
    } | null;
  };
};

export function ArtifactList() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selected, setSelected] = useState<Artifact | null>(null);
  const [status, setStatus] = useState("");

  async function loadArtifacts() {
    const response = await fetch("/api/artifacts");

    if (!response.ok) {
      setStatus("讀取 artifact 失敗。");
      return;
    }

    const data = (await response.json()) as { artifacts: Artifact[] };
    setArtifacts(data.artifacts);
    setSelected((current) => current ?? data.artifacts[0] ?? null);
  }

  useEffect(() => {
    void Promise.resolve().then(loadArtifacts);
  }, []);

  async function deleteArtifact(artifactId: string) {
    const response = await fetch(`/api/artifacts/${artifactId}`, { method: "DELETE" });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    setStatus("Artifact 已刪除。");
    setSelected(null);
    await loadArtifacts();
  }

  return (
    <div className="surface artifact-layout">
      <aside className="artifact-list">
        {artifacts.length === 0 ? <p className="status-line">尚未保存 artifact。</p> : null}
        {artifacts.map((artifact) => (
          <button
            className={selected?.id === artifact.id ? "active-item" : ""}
            key={artifact.id}
            onClick={() => setSelected(artifact)}
            type="button"
          >
            {artifact.title}
            <small>
              {artifact.type} · {new Date(artifact.createdAt).toLocaleString()}
            </small>
          </button>
        ))}
      </aside>
      <section className="artifact-detail">
        {selected ? (
          <>
            <header className="artifact-head">
              <div>
                <h3>{selected.title}</h3>
                <p className="status-line">
                  {selected.run.modelConfig
                    ? `${selected.run.modelConfig.provider.name} / ${selected.run.modelConfig.displayName}`
                    : selected.run.toolId}
                </p>
              </div>
              <div className="button-row">
                <a className="button secondary" href={`/api/artifacts/${selected.id}/download`}>
                  下載
                </a>
                <button className="button secondary" onClick={() => void deleteArtifact(selected.id)} type="button">
                  刪除
                </button>
              </div>
            </header>
            <pre className="artifact-content">{selected.inlineContent}</pre>
          </>
        ) : (
          <div className="status-line">選擇一個 artifact 查看內容。</div>
        )}
        {status ? <div className="status-line">{status}</div> : null}
      </section>
    </div>
  );
}
