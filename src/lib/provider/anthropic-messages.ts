import type { ChatCompleteInput, ChatMessageInput, ChatStreamInput, ProviderAdapter, ValidationResult } from "@/lib/provider/types";

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
    Authorization: apiKey,
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

function hasImageParts(messages: ChatMessageInput[]) {
  return messages.some(
    (message) => Array.isArray(message.content) && message.content.some((part) => part.type === "image"),
  );
}

function hasFileParts(messages: ChatMessageInput[]) {
  return messages.some(
    (message) => Array.isArray(message.content) && message.content.some((part) => part.type === "file"),
  );
}

function textFromContent(content: ChatMessageInput["content"]) {
  if (typeof content === "string") {
    return content;
  }

  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

function toMessagesBody(input: ChatCompleteInput, stream: boolean) {
  if (hasImageParts(input.messages)) {
    throw new Error("Claude Messages vision attachments are not enabled in V1.");
  }

  if (hasFileParts(input.messages)) {
    throw new Error("Native file input requires an OpenAI Responses provider.");
  }

  const system = input.messages
    .filter((message) => message.role === "system")
    .map((message) => textFromContent(message.content))
    .join("\n\n");
  const messages = input.messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      content: textFromContent(message.content),
    }));

  return {
    model: input.modelId,
    max_tokens: 1000,
    stream,
    ...(system ? { system } : {}),
    messages: messages.length > 0 ? messages : [{ role: "user", content: "Hello" }],
  };
}

function extractMessageText(json: unknown) {
  if (!json || typeof json !== "object") {
    return null;
  }

  const message = json as {
    content?: Array<{
      text?: unknown;
      type?: string;
    }>;
  };
  const chunks =
    message.content
      ?.map((content) => content.text)
      .filter((text): text is string => typeof text === "string") ?? [];

  return chunks.length > 0 ? chunks.join("") : null;
}

function extractResponseModel(json: unknown) {
  if (!json || typeof json !== "object") {
    return undefined;
  }

  const event = json as {
    model?: unknown;
    message?: {
      model?: unknown;
    };
  };

  if (typeof event.model === "string") {
    return event.model;
  }

  if (typeof event.message?.model === "string") {
    return event.message.model;
  }

  return undefined;
}

function extractStreamToken(json: unknown) {
  if (!json || typeof json !== "object") {
    return null;
  }

  const event = json as {
    type?: string;
    delta?: {
      text?: unknown;
    };
  };

  if (event.type === "content_block_delta" && typeof event.delta?.text === "string") {
    return event.delta.text;
  }

  return null;
}

export const anthropicMessagesAdapter: ProviderAdapter = {
  async chatComplete(input: ChatCompleteInput) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/messages"),
      {
        method: "POST",
        headers: headers(input.apiKey),
        body: JSON.stringify(toMessagesBody(input, false)),
      },
      input.timeoutMs ?? 60000,
      input.signal,
    );

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const json = await response.json();
    const content = extractMessageText(json);

    if (typeof content !== "string") {
      throw new Error("Provider returned an unexpected messages payload.");
    }

    return {
      content,
      responseModel: extractResponseModel(json),
    };
  },

  async chatStream(input: ChatStreamInput) {
    const response = await fetchWithTimeout(
      apiUrl(input.baseUrl, "/messages"),
      {
        method: "POST",
        headers: headers(input.apiKey),
        body: JSON.stringify(toMessagesBody(input, true)),
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
