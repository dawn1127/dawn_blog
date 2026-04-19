"use client";

import { useEffect, useMemo, useState } from "react";

type ApiStyle = "openai_compatible" | "openai_responses" | "anthropic_messages";

type ModelConfig = {
  id: string;
  modelId: string;
  displayName: string;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  supportsFiles: boolean;
  supportsImages: boolean;
  supportsNativeFiles: boolean;
  supportsJsonMode: boolean;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  maxInputTokens: number | null;
  notes: string | null;
};

type ProviderConfig = {
  id: string;
  name: string;
  baseUrl: string;
  apiStyle: ApiStyle;
  apiKeyMasked: string;
  enabled: boolean;
  models: ModelConfig[];
};

type ValidationResult = {
  ok: boolean;
  error?: string;
  checks: Record<string, boolean | undefined>;
};

type ModelForm = {
  modelId: string;
  displayName: string;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  supportsFiles: boolean;
  supportsImages: boolean;
  supportsNativeFiles: boolean;
  supportsJsonMode: boolean;
  enabled: boolean;
  isDefault: boolean;
  sortOrder: number;
  maxInputTokens: string;
  notes: string;
};

const apiStyleOptions: Array<{ value: ApiStyle; label: string }> = [
  { value: "openai_responses", label: "OpenAI Responses" },
  { value: "openai_compatible", label: "Chat Completions compatible" },
  { value: "anthropic_messages", label: "Claude Messages" },
];

const emptyProviderForm = {
  name: "",
  baseUrl: "https://api.openai.com",
  apiStyle: "openai_responses" as ApiStyle,
  apiKey: "",
};

const emptyProviderEditForm = {
  name: "",
  baseUrl: "",
  apiStyle: "openai_responses" as ApiStyle,
  apiKey: "",
  enabled: true,
};

const emptyModelForm: ModelForm = {
  modelId: "",
  displayName: "",
  supportsStreaming: true,
  supportsEmbeddings: false,
  supportsFiles: false,
  supportsImages: false,
  supportsNativeFiles: false,
  supportsJsonMode: false,
  enabled: true,
  isDefault: false,
  sortOrder: 0,
  maxInputTokens: "",
  notes: "",
};

const modelCapabilityFields: Array<[keyof ModelForm, string]> = [
  ["supportsStreaming", "Streaming"],
  ["supportsEmbeddings", "Embeddings"],
  ["supportsFiles", "Local files"],
  ["supportsImages", "Images"],
  ["supportsNativeFiles", "Native files"],
  ["supportsJsonMode", "JSON mode"],
  ["enabled", "Enabled"],
  ["isDefault", "Default"],
];

function checksToText(checks: ValidationResult["checks"]) {
  return Object.entries(checks)
    .map(([key, value]) => `${key}:${value ? "ok" : "fail"}`)
    .join(", ");
}

function providerToEditForm(provider?: ProviderConfig) {
  if (!provider) {
    return emptyProviderEditForm;
  }

  return {
    name: provider.name,
    baseUrl: provider.baseUrl,
    apiStyle: provider.apiStyle,
    apiKey: "",
    enabled: provider.enabled,
  };
}

function modelToForm(model?: ModelConfig): ModelForm {
  if (!model) {
    return emptyModelForm;
  }

  return {
    modelId: model.modelId,
    displayName: model.displayName,
    supportsStreaming: model.supportsStreaming,
    supportsEmbeddings: model.supportsEmbeddings,
    supportsFiles: model.supportsFiles,
    supportsImages: model.supportsImages,
    supportsNativeFiles: model.supportsNativeFiles,
    supportsJsonMode: model.supportsJsonMode,
    enabled: model.enabled,
    isDefault: model.isDefault,
    sortOrder: model.sortOrder,
    maxInputTokens: model.maxInputTokens ? String(model.maxInputTokens) : "",
    notes: model.notes ?? "",
  };
}

function modelPayload(form: ModelForm) {
  return {
    ...form,
    sortOrder: Number(form.sortOrder) || 0,
    maxInputTokens: form.maxInputTokens ? Number(form.maxInputTokens) : null,
    notes: form.notes || null,
  };
}

async function readErrorText(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? response.statusText;
  } catch {
    return response.text();
  }
}

export function ProviderAdmin() {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const [providerForm, setProviderForm] = useState(emptyProviderForm);
  const [providerEditForm, setProviderEditForm] = useState(emptyProviderEditForm);
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);
  const [modelEditForm, setModelEditForm] = useState<ModelForm>(emptyModelForm);
  const [status, setStatus] = useState("");
  const selectedProvider = useMemo(
    () => providers.find((provider) => provider.id === selectedProviderId),
    [providers, selectedProviderId],
  );
  const allModels = useMemo(
    () =>
      providers.flatMap((provider) =>
        provider.models.map((model) => ({
          ...model,
          providerId: provider.id,
          providerName: provider.name,
        })),
      ),
    [providers],
  );
  const selectedModel = allModels.find((model) => model.id === selectedModelId);

  async function loadProviders(nextSelectedModelId = selectedModelId) {
    const response = await fetch("/api/admin/providers");

    if (!response.ok) {
      setStatus("讀取 provider 失敗。");
      return;
    }

    const data = (await response.json()) as { providers: ProviderConfig[] };
    const nextProvider =
      data.providers.find((provider) => provider.id === selectedProviderId) ?? data.providers[0];
    const nextModels = data.providers.flatMap((provider) => provider.models);
    const nextModel = nextModels.find((model) => model.id === nextSelectedModelId) ?? nextModels[0];

    setProviders(data.providers);
    setSelectedProviderId(nextProvider?.id ?? "");
    setProviderEditForm(providerToEditForm(nextProvider));
    setSelectedModelId(nextModel?.id ?? "");
    setModelEditForm(modelToForm(nextModel));
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadProviders());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectProvider(providerId: string) {
    const provider = providers.find((item) => item.id === providerId);
    setSelectedProviderId(provider?.id ?? "");
    setProviderEditForm(providerToEditForm(provider));
  }

  function selectModel(model: ModelConfig, providerId?: string) {
    setSelectedModelId(model.id);
    setModelEditForm(modelToForm(model));

    if (providerId) {
      selectProvider(providerId);
    }
  }

  async function createProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("新增 provider 中...");
    const response = await fetch("/api/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...providerForm, enabled: true }),
    });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    setProviderForm(emptyProviderForm);
    setStatus("Provider 已新增，API key 已加密保存。");
    await loadProviders();
  }

  async function updateProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProvider) {
      setStatus("請先選擇 provider。");
      return;
    }

    const payload: Record<string, unknown> = {
      name: providerEditForm.name,
      baseUrl: providerEditForm.baseUrl,
      apiStyle: providerEditForm.apiStyle,
      enabled: providerEditForm.enabled,
    };

    if (providerEditForm.apiKey.trim()) {
      payload.apiKey = providerEditForm.apiKey.trim();
    }

    const response = await fetch(`/api/admin/providers/${selectedProvider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    setProviderEditForm((current) => ({ ...current, apiKey: "" }));
    setStatus("Provider 已保存。");
    await loadProviders();
  }

  async function createModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProvider) {
      setStatus("請先選擇 provider。");
      return;
    }

    const response = await fetch(`/api/admin/providers/${selectedProvider.id}/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...modelPayload(modelForm), maxInputTokens: modelForm.maxInputTokens ? Number(modelForm.maxInputTokens) : undefined, notes: modelForm.notes || undefined }),
    });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    const data = (await response.json()) as { model: ModelConfig };
    setModelForm(emptyModelForm);
    setStatus("Model 已新增。");
    await loadProviders(data.model.id);
  }

  async function updateModel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedModel) {
      setStatus("請先選擇 model。");
      return;
    }

    const response = await fetch(`/api/admin/models/${selectedModel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modelPayload(modelEditForm)),
    });

    if (!response.ok) {
      setStatus(await response.text());
      return;
    }

    setStatus("Model 已保存。");
    await loadProviders(selectedModel.id);
  }

  async function validateModel(modelId: string) {
    setStatus("測試連線中...");
    const response = await fetch(`/api/admin/models/${modelId}/validate`, { method: "POST" });
    const result = (await response.json()) as ValidationResult;

    setStatus(result.ok ? `連線成功：${checksToText(result.checks)}` : `連線失敗：${result.error ?? checksToText(result.checks)}`);
  }

  async function toggleProvider(provider: ProviderConfig) {
    const response = await fetch(`/api/admin/providers/${provider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !provider.enabled }),
    });

    setStatus(response.ok ? "Provider 已更新。" : await response.text());
    await loadProviders();
  }

  async function toggleModel(model: ModelConfig) {
    const response = await fetch(`/api/admin/models/${model.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !model.enabled }),
    });

    setStatus(response.ok ? "Model 已更新。" : await response.text());
    await loadProviders(model.id);
  }

  async function deleteProvider(provider: ProviderConfig) {
    if (!window.confirm(`Delete provider "${provider.name}" and all its models?`)) {
      return;
    }

    const response = await fetch(`/api/admin/providers/${provider.id}`, { method: "DELETE" });

    if (!response.ok) {
      setStatus(await readErrorText(response));
      return;
    }

    setStatus("Provider deleted.");
    await loadProviders();
  }

  async function deleteModel(model: ModelConfig) {
    if (!window.confirm(`Delete model "${model.displayName}" (${model.modelId})?`)) {
      return;
    }

    const response = await fetch(`/api/admin/models/${model.id}`, { method: "DELETE" });

    if (!response.ok) {
      setStatus(await readErrorText(response));
      return;
    }

    setStatus("Model deleted.");
    await loadProviders();
  }

  function renderModelFields(form: ModelForm, setForm: (form: ModelForm) => void) {
    return (
      <>
        <label className="field">
          <span>Model ID</span>
          <input value={form.modelId} onChange={(event) => setForm({ ...form, modelId: event.target.value })} />
        </label>
        <label className="field">
          <span>Display name</span>
          <input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
        </label>
        <div className="checkbox-grid">
          {modelCapabilityFields.map(([key, label]) => (
            <label key={key}>
              <input
                checked={Boolean(form[key])}
                onChange={(event) => setForm({ ...form, [key]: event.target.checked })}
                type="checkbox"
              />
              {label}
            </label>
          ))}
        </div>
        <label className="field">
          <span>Sort order</span>
          <input
            value={form.sortOrder}
            onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })}
            type="number"
          />
        </label>
        <label className="field">
          <span>Max input tokens</span>
          <input
            value={form.maxInputTokens}
            onChange={(event) => setForm({ ...form, maxInputTokens: event.target.value })}
            placeholder="optional"
            type="number"
          />
        </label>
        <label className="field">
          <span>Notes</span>
          <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </label>
      </>
    );
  }

  return (
    <div className="provider-admin-shell">
      {status ? <p className="status-line provider-status">{status}</p> : null}
      <div className="provider-admin-top">
        <section className="settings-section">
          <h3>Providers</h3>
          <form className="compact-form" onSubmit={createProvider}>
            <input
              value={providerForm.name}
              onChange={(event) => setProviderForm({ ...providerForm, name: event.target.value })}
              placeholder="Provider name"
            />
            <input
              value={providerForm.baseUrl}
              onChange={(event) => setProviderForm({ ...providerForm, baseUrl: event.target.value })}
              placeholder="Base URL"
            />
            <select
              value={providerForm.apiStyle}
              onChange={(event) => setProviderForm({ ...providerForm, apiStyle: event.target.value as ApiStyle })}
            >
              {apiStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              value={providerForm.apiKey}
              onChange={(event) => setProviderForm({ ...providerForm, apiKey: event.target.value })}
              placeholder="API key"
              type="password"
            />
            <button className="button" type="submit">
              新增 Provider
            </button>
          </form>

          <form className="form-stack edit-provider-form" onSubmit={updateProvider}>
            <label className="field">
              <span>選擇 provider</span>
              <select value={selectedProvider?.id ?? ""} onChange={(event) => selectProvider(event.target.value)}>
                <option value="">未選擇</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="two-col-form">
              <label className="field">
                <span>Name</span>
                <input
                  disabled={!selectedProvider}
                  value={providerEditForm.name}
                  onChange={(event) => setProviderEditForm({ ...providerEditForm, name: event.target.value })}
                />
              </label>
              <label className="field">
                <span>Base URL</span>
                <input
                  disabled={!selectedProvider}
                  value={providerEditForm.baseUrl}
                  onChange={(event) => setProviderEditForm({ ...providerEditForm, baseUrl: event.target.value })}
                />
              </label>
              <label className="field">
                <span>API style</span>
                <select
                  disabled={!selectedProvider}
                  value={providerEditForm.apiStyle}
                  onChange={(event) =>
                    setProviderEditForm({ ...providerEditForm, apiStyle: event.target.value as ApiStyle })
                  }
                >
                  {apiStyleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>New API key</span>
                <input
                  disabled={!selectedProvider}
                  value={providerEditForm.apiKey}
                  onChange={(event) => setProviderEditForm({ ...providerEditForm, apiKey: event.target.value })}
                  placeholder={selectedProvider ? `留空保留 ${selectedProvider.apiKeyMasked}` : "先選 provider"}
                  type="password"
                />
              </label>
            </div>
            <label className="inline-check">
              <input
                checked={providerEditForm.enabled}
                disabled={!selectedProvider}
                onChange={(event) => setProviderEditForm({ ...providerEditForm, enabled: event.target.checked })}
                type="checkbox"
              />
              Enabled
            </label>
            <div className="button-row">
              <button className="button" disabled={!selectedProvider} type="submit">
                保存 Provider
              </button>
              {selectedProvider ? (
                <>
                  <button className="button secondary" onClick={() => void toggleProvider(selectedProvider)} type="button">
                    {selectedProvider.enabled ? "停用" : "啟用"}
                  </button>
                  <button className="button danger" onClick={() => void deleteProvider(selectedProvider)} type="button">
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </form>
        </section>

        <aside className="settings-section model-editor">
          <h3>Model 詳情</h3>
          {selectedModel ? (
            <form className="form-stack" onSubmit={updateModel}>
              <p className="status-line">{selectedModel.providerName}</p>
              {renderModelFields(modelEditForm, setModelEditForm)}
              <div className="button-row">
                <button className="button" type="submit">
                  保存 Model
                </button>
                <button className="button secondary" onClick={() => void validateModel(selectedModel.id)} type="button">
                  測試
                </button>
              </div>
            </form>
          ) : (
            <p className="status-line">選擇一個 model 進行編輯。</p>
          )}
        </aside>
      </div>

      <section className="settings-section">
        <div className="section-headline">
          <h3>Models</h3>
          <p>Native files 專門用於 OpenAI Responses 原生文件輸入；Local files 保留給之後的本地解析。</p>
        </div>
        <form className="compact-form" onSubmit={createModel}>
          <select value={selectedProvider?.id ?? ""} onChange={(event) => selectProvider(event.target.value)}>
            <option value="">未選擇 provider</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <input
            value={modelForm.modelId}
            onChange={(event) => setModelForm({ ...modelForm, modelId: event.target.value })}
            placeholder="model id"
          />
          <input
            value={modelForm.displayName}
            onChange={(event) => setModelForm({ ...modelForm, displayName: event.target.value })}
            placeholder="display name"
          />
          <label className="inline-check">
            <input
              checked={modelForm.supportsNativeFiles}
              onChange={(event) => setModelForm({ ...modelForm, supportsNativeFiles: event.target.checked })}
              type="checkbox"
            />
            Native files
          </label>
          <button className="button" disabled={!selectedProvider} type="submit">
            新增 Model
          </button>
        </form>
        <div className="table-wrap quiet-table">
          <table>
            <thead>
              <tr>
                <th>Provider</th>
                <th>Model</th>
                <th>Capabilities</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {allModels.map((model) => (
                <tr className={model.id === selectedModelId ? "selected-row" : ""} key={model.id}>
                  <td>{model.providerName}</td>
                  <td>
                    {model.displayName}
                    <div className="status-line">{model.modelId}</div>
                  </td>
                  <td>
                    {[
                      model.supportsStreaming ? "stream" : null,
                      model.supportsEmbeddings ? "embed" : null,
                      model.supportsFiles ? "local files" : null,
                      model.supportsImages ? "images" : null,
                      model.supportsNativeFiles ? "native files" : null,
                      model.supportsJsonMode ? "json" : null,
                      model.isDefault ? "default" : null,
                    ]
                      .filter(Boolean)
                      .join(", ") || "none"}
                  </td>
                  <td>{model.enabled ? "enabled" : "disabled"}</td>
                  <td className="button-row">
                    <button
                      className="button secondary"
                      onClick={() => selectModel(model, model.providerId)}
                      type="button"
                    >
                      編輯
                    </button>
                    <button className="button secondary" onClick={() => void validateModel(model.id)} type="button">
                      測試
                    </button>
                    <button className="button secondary" onClick={() => void toggleModel(model)} type="button">
                      {model.enabled ? "停用" : "啟用"}
                    </button>
                    <button className="button danger" onClick={() => void deleteModel(model)} type="button">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
