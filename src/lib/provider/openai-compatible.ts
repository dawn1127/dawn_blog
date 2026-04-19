import type {
  ChatCompleteInput,
  ChatContentPart,
  ChatMessageInput,
  ChatStreamInput,
  ProviderAdapter,
  ValidationResult,
} from "@/lib/provider/types";

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function apiUrl(baseUrl: string, path: string) {
  const base = normalizeBaseUrl(baseUrl);
  return base.endsWith("/v1") ? `${base}${path}` : `${base}/v1${path}`;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, externalSignal?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timeout = setTimeout(abort, timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) {
      abort();
    } else {
      externalSignal.addEventListener("abort", abort, { once: true });
    }
  }

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abort);
  }
}

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  try {
    const json = (await response.json()) as { error?: { message?: string }; message?: string };
    return json.error?.message || json.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

function toDataUrl(part: Extract<ChatContentPart, { type: "image" }>) {
  return `data:${part.mimeType};base64,${part.base64Data}`;
}

function toChatContent(content: ChatMessageInput["content"]) {
  if (typeof content === "string") {
    return content;
  }

  return content.map((part) => {
    if (part.type === "text") {
      return {
        type: "text",
        text: part.text,
      };
    }

    if (part.type === "file") {
      throw new Error("Native file input requires an OpenAI Responses provider.");
    }

    return {
      type: "image_url",
      image_url: {
        url: toDataUrl(part),
        detail: part.detail ?? "auto",
      },
    };
  });
}

function toChatMessages(messages: ChatMessageInput[]) {
  return messages.map((message) => ({
    role: message.role,
    content: toChatContent(message.content),
  }));
}

export const openAiCompatibleAdapter: ProviderAdapter = {
  async chatComplete(input: ChatCompleteInput) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/chat/completions"),
      {
        method: "POST",
        headers: headers(input.apiKey),
        body: JSON.stringify({
          model: input.modelId,
          messages: toChatMessages(input.messages),
          stream: false,
        }),
      },
      input.timeoutMs ?? 60000,
      input.signal,
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const json = (await response.json()) as {
      model?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new Error("Provider returned an unexpected completion response.");
    }

    return {
      content,
      responseModel: json.model,
    };
  },

  async chatStream(input: ChatStreamInput) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/chat/completions"),
      {
        method: "POST",
        headers: headers(input.apiKey),
        body: JSON.stringify({
          model: input.modelId,
          messages: toChatMessages(input.messages),
          stream: true,
        }),
      },
      input.timeoutMs ?? 60000,
      input.signal,
    );

    if (!response.ok || !response.body) {
      throw new Error(response.ok ? "Provider returned an empty stream." : await parseError(response));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let responseModel: string | undefined;

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice(5).trim();

        if (!payload || payload === "[DONE]") {
          continue;
        }

        const json = JSON.parse(payload) as {
          model?: string;
          choices?: Array<{ delta?: { content?: string } }>;
        };
        responseModel ||= json.model;
        const token = json.choices?.[0]?.delta?.content;

        if (token) {
          await input.onToken(token);
        }
      }
    }

    return { responseModel };
  },

  async listModels(input) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/models"),
      {
        method: "GET",
        headers: headers(input.apiKey),
      },
      input.timeoutMs ?? 10000,
      input.signal,
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const json = (await response.json()) as { data?: Array<{ id?: string }> };
    return json.data?.map((model) => model.id).filter((id): id is string => Boolean(id)) ?? [];
  },

  async validateConnection(input): Promise<ValidationResult> {
    const checks: ValidationResult["checks"] = {
      baseUrl: false,
      apiKey: false,
      model: false,
      responseShape: false,
    };

    try {
      await this.chatComplete({
        ...input,
        messages: [{ role: "user", content: "Reply with OK." }],
        timeoutMs: input.timeoutMs ?? 10000,
      });
      checks.baseUrl = true;
      checks.apiKey = true;
      checks.model = true;
      checks.responseShape = true;

      if (input.supportsStreaming) {
        let sawToken = false;
        await this.chatStream({
          ...input,
          messages: [{ role: "user", content: "Reply with OK." }],
          timeoutMs: input.timeoutMs ?? 10000,
          onToken: (token) => {
            sawToken = sawToken || token.length > 0;
          },
        });
        checks.streaming = sawToken;
      }

      return { ok: true, checks };
    } catch (error) {
      return {
        ok: false,
        checks,
        error: error instanceof Error ? error.message : "Unknown provider validation error.",
      };
    }
  },
};
