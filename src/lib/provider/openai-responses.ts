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

function authorizationHeader(baseUrl: string, apiKey: string) {
  try {
    const hostname = new URL(baseUrl).hostname;
    return hostname === "api.openai.com" ? `Bearer ${apiKey}` : apiKey;
  } catch {
    return apiKey;
  }
}

function headers(baseUrl: string, apiKey: string) {
  return {
    Authorization: authorizationHeader(baseUrl, apiKey),
    "Content-Type": "application/json",
  };
}

async function parseError(response: Response) {
  try {
    const json = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };
    return json.error?.message || json.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

function toDataUrl(part: Extract<ChatContentPart, { type: "image" | "file" }>) {
  return `data:${part.mimeType};base64,${part.base64Data}`;
}

function textFromContent(content: ChatMessageInput["content"]) {
  if (typeof content === "string") {
    return content;
  }

  return content
    .filter((part): part is Extract<ChatContentPart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function toResponseContent(role: ChatMessageInput["role"], content: ChatMessageInput["content"]) {
  if (typeof content === "string") {
    return [
      {
        type: role === "assistant" ? "output_text" : "input_text",
        text: content,
      },
    ];
  }

  return content.map((part) => {
    if (part.type === "text") {
      return {
        type: role === "assistant" ? "output_text" : "input_text",
        text: part.text,
      };
    }

    if (part.type === "image") {
      return {
        type: "input_image",
        image_url: toDataUrl(part),
        detail: part.detail ?? "auto",
      };
    }

    return {
      type: "input_file",
      filename: part.filename,
      file_data: toDataUrl(part),
    };
  });
}

function toResponsesBody(input: ChatCompleteInput, stream: boolean) {
  const instructions = input.messages
    .filter((message) => message.role === "system")
    .map((message) => textFromContent(message.content))
    .join("\n\n");
  const messages = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: toResponseContent(message.role, message.content),
    }));

  return {
    model: input.modelId,
    stream,
    reasoning: {
      effort: input.reasoningEffort === "extended" ? "high" : "medium",
    },
    ...(instructions ? { instructions } : {}),
    input: messages.length > 0 ? messages : [{ role: "user", content: [{ type: "input_text", text: "Hello" }] }],
  };
}

function extractOutputText(json: unknown): string | null {
  if (!json || typeof json !== "object") {
    return null;
  }

  const response = json as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        text?: unknown;
        type?: string;
      }>;
    }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const chunks =
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === "string") ?? [];

  return chunks.length > 0 ? chunks.join("") : null;
}

function extractResponseModel(json: unknown): string | undefined {
  if (!json || typeof json !== "object") {
    return undefined;
  }

  const event = json as {
    model?: unknown;
    response?: {
      model?: unknown;
    };
  };

  if (typeof event.model === "string") {
    return event.model;
  }

  if (typeof event.response?.model === "string") {
    return event.response.model;
  }

  return undefined;
}

function extractStreamToken(json: unknown): string | null {
  if (!json || typeof json !== "object") {
    return null;
  }

  const event = json as {
    type?: string;
    delta?: unknown;
    choices?: Array<{ delta?: { content?: unknown } }>;
  };

  if (typeof event.delta === "string") {
    return event.delta;
  }

  const chatDelta = event.choices?.[0]?.delta?.content;

  if (typeof chatDelta === "string") {
    return chatDelta;
  }

  return null;
}

export const openAiResponsesAdapter: ProviderAdapter = {
  async chatComplete(input: ChatCompleteInput) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/responses"),
      {
        method: "POST",
        headers: headers(input.baseUrl, input.apiKey),
        body: JSON.stringify(toResponsesBody(input, false)),
      },
      input.timeoutMs ?? 60000,
      input.signal,
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const json = await response.json();
    const content = extractOutputText(json);

    if (typeof content !== "string") {
      throw new Error("Provider returned an unexpected responses payload.");
    }

    return {
      content,
      responseModel: extractResponseModel(json),
    };
  },

  async chatStream(input: ChatStreamInput) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/responses"),
      {
        method: "POST",
        headers: headers(input.baseUrl, input.apiKey),
        body: JSON.stringify(toResponsesBody(input, true)),
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

        const json = JSON.parse(payload);
        responseModel ||= extractResponseModel(json);
        const token = extractStreamToken(json);

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
        headers: headers(input.baseUrl, input.apiKey),
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
