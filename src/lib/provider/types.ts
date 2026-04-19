import type { ModelConfig, ProviderConfig } from "@prisma/client";

export type ProviderModel = ProviderConfig & {
  models: ModelConfig[];
};

export type ChatContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      mimeType: string;
      base64Data: string;
      detail?: "auto" | "low" | "high";
    }
  | {
      type: "file";
      filename: string;
      mimeType: string;
      base64Data: string;
    };

export type ChatMessageInput = {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
};

export type ReasoningEffort = "standard" | "extended";

export type ChatCompleteInput = {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  messages: ChatMessageInput[];
  reasoningEffort?: ReasoningEffort;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type ChatStreamInput = ChatCompleteInput & {
  onToken: (token: string) => void | Promise<void>;
};

export type ChatCompleteResult = {
  content: string;
  responseModel?: string;
};

export type ChatStreamResult = {
  responseModel?: string;
};

export type ValidationResult = {
  ok: boolean;
  checks: {
    baseUrl: boolean;
    apiKey: boolean;
    model: boolean;
    streaming?: boolean;
    responseShape: boolean;
  };
  error?: string;
};

export type ProviderAdapter = {
  chatComplete(input: ChatCompleteInput): Promise<ChatCompleteResult>;
  chatStream(input: ChatStreamInput): Promise<ChatStreamResult>;
  listModels?(input: { baseUrl: string; apiKey: string; signal?: AbortSignal; timeoutMs?: number }): Promise<string[]>;
  validateConnection(input: ChatCompleteInput & { supportsStreaming: boolean }): Promise<ValidationResult>;
};
