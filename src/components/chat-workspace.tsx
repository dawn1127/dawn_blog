"use client";

import Link from "next/link";
import { type ComponentPropsWithoutRef, type ReactNode, isValidElement, useEffect, useRef, useState } from "react";
import { Highlight, Prism, type PrismTheme } from "prism-react-renderer";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  bootstrapRetryDelayMs,
  describeBootstrapError,
  fetchJsonNoStore,
  shouldRetryBootstrapError,
  type BootstrapPhase,
} from "@/lib/client/bootstrap";
import { extractQuickReplies } from "@/lib/chat/quick-replies";
import { documentAccept, getUploadKind, imageAccept } from "@/lib/file-types";
import { getSettingsHref } from "@/lib/network-navigation";

type ApiStyle = "openai_compatible" | "openai_responses" | "anthropic_messages";
type FileAssetKind = "spreadsheet" | "document" | "image";
type AttachmentStatus = "pending" | "uploading" | "queued" | "processing" | "completed" | "failed";
type ThinkingMode = "standard" | "extended";
type ConversationKey = string;
type ConversationStreamPhase = "idle" | "requesting" | "thinking" | "streaming" | "completed" | "failed";

type ModelOption = {
  id: string;
  modelId: string;
  displayName: string;
  providerName: string;
  providerApiStyle: ApiStyle;
  supportsStreaming: boolean;
  supportsFiles: boolean;
  supportsImages: boolean;
  supportsNativeFiles: boolean;
};

type ConversationItem = {
  id: string;
  folderId: string | null;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
};

type ConversationFolder = {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

type FileAsset = {
  id: string;
  kind: FileAssetKind;
  originalName: string;
  mimeType: string;
  parseStatus: "queued" | "processing" | "completed" | "failed";
  parseError: string | null;
  sizeBytes: number;
  deletedAt?: string | null;
};

type MessageAttachment = {
  id: string;
  sortOrder: number;
  fileAsset: FileAsset;
};

type UiMessage = {
  id: string;
  dbMessageId?: string;
  runId?: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "completed" | "failed";
  artifactSaved?: boolean;
  providerName?: string;
  modelId?: string;
  modelDisplayName?: string;
  providerResponseModel?: string | null;
  thinkingMode?: ThinkingMode;
  streamPhase?: ConversationStreamPhase;
  attachments: MessageAttachment[];
};

type ComposerAttachment = {
  localId: string;
  kind: FileAssetKind;
  file?: File;
  fileAssetId?: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl?: string;
  status: AttachmentStatus;
  parseError?: string | null;
};

type ConversationDraftState = {
  attachments: ComposerAttachment[];
  folderId: string | null;
  input: string;
  modelConfigId: string;
  thinkingMode: ThinkingMode;
};

type ConversationUiState = {
  activeReplyIds: string[];
  awaitingConversationId: boolean;
  loadToken: number;
  messages: UiMessage[];
  phase: ConversationStreamPhase;
  statusMessage: string;
};

type ConversationState = {
  conversationId: string | null;
  draft: ConversationDraftState;
  key: ConversationKey;
  ui: ConversationUiState;
};

const softCodeTheme: PrismTheme = {
  plain: {
    color: "#1f2328",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: {
        color: "#9ca3af",
        fontStyle: "italic",
      },
    },
    {
      types: ["punctuation", "operator"],
      style: {
        color: "#7b8594",
      },
    },
    {
      types: ["property", "tag", "boolean", "number", "constant", "symbol", "deleted"],
      style: {
        color: "#95523a",
      },
    },
    {
      types: ["selector", "attr-name", "string", "char", "builtin", "inserted"],
      style: {
        color: "#2f7856",
      },
    },
    {
      types: ["keyword", "atrule"],
      style: {
        color: "#4a659a",
      },
    },
    {
      types: ["function", "class-name"],
      style: {
        color: "#2b6273",
      },
    },
    {
      types: ["regex", "important", "variable"],
      style: {
        color: "#896231",
      },
    },
    {
      types: ["bold"],
      style: {
        fontWeight: "700",
      },
    },
  ],
};

type PersistedConversationMessage = {
  attachments: MessageAttachment[];
  content: string;
  id: string;
  modelConfig: { displayName: string; modelId: string } | null;
  provider: { name: string } | null;
  providerResponseModel: string | null;
  role: "user" | "assistant" | "system" | "tool";
  runs?: Array<{ id: string }>;
  status: "streaming" | "completed" | "failed";
};

type ChatWorkspaceProps = {
  isAdmin: boolean;
};

type SendMessageOptions = {
  conversationKey?: ConversationKey;
  messageOverride?: string;
  useDraftAttachments?: boolean;
};

type PreviewImageState = {
  contentHref: string;
  downloadHref: string;
  fileId: string;
  originalName: string;
};

type WorkspaceBootstrapResourceKey = "models" | "conversations" | "folders" | "files";

type WorkspaceBootstrapResourceState = {
  message: string;
  phase: BootstrapPhase;
};

type WorkspaceBootstrapState = {
  attempt: number;
  message: string;
  phase: BootstrapPhase;
  resources: Record<WorkspaceBootstrapResourceKey, WorkspaceBootstrapResourceState>;
};

type ReplyStreamControllerMap = Record<string, AbortController>;
type ReplyThinkingTimerMap = Record<string, number>;

const nativeFileLimitBytes = 50 * 1024 * 1024;
const maxConcurrentConversationStreams = 3;
const draftConversationPrefix = "draft:";
const extendedThinkingDelayMs = 1200;
const workspaceBootstrapMaxAttempts = 4;
const internalStreamErrorPattern = /controller is already closed|invalid state|readablestream/i;
const canceledReplyMessage = "已停止回覆";
const interruptedReplyMessage = "回覆中斷，請再試一次。";
const thinkingOptions: Array<{ id: ThinkingMode; label: string; description: string; detail: string }> = [
  {
    id: "standard",
    label: "標準",
    description: "較快開始回答，文字會逐步出現。",
    detail: "適合日常聊天、查詢與一般分析。通常會很快開始輸出，看起來像 AI 一邊整理、一邊把答案慢慢寫出來。",
  },
  {
    id: "extended",
    label: "加長思考",
    description: "先深度整理，再輸出最終答案。",
    detail:
      "適合複雜規劃、排錯、比較與長鏈推理。AI 會先花較長時間完整思考，畫面可能先停在「深度思考中」；等答案整理好後，才會集中或快速輸出最終回答。",
  },
];

const workspaceBootstrapResourceLabels: Record<WorkspaceBootstrapResourceKey, string> = {
  conversations: "對話資料",
  files: "檔案資料",
  folders: "Project 資料",
  models: "模型設定",
};

const workspaceBootstrapResourceKeys: WorkspaceBootstrapResourceKey[] = ["models", "conversations", "folders", "files"];

function createWorkspaceBootstrapResources(
  phase: BootstrapPhase = "idle",
): Record<WorkspaceBootstrapResourceKey, WorkspaceBootstrapResourceState> {
  return {
    conversations: { message: "", phase },
    files: { message: "", phase },
    folders: { message: "", phase },
    models: { message: "", phase },
  };
}

function createWorkspaceBootstrapState(): WorkspaceBootstrapState {
  return {
    attempt: 0,
    message: "",
    phase: "idle",
    resources: createWorkspaceBootstrapResources(),
  };
}

function attachmentStatusLabel(status: AttachmentStatus) {
  switch (status) {
    case "pending":
      return "待送出";
    case "uploading":
      return "上傳中";
    case "completed":
      return "已加入";
    case "failed":
      return "失敗";
    case "queued":
    case "processing":
      return "已加入";
  }
}

function shortName(name: string) {
  return name.length > 28 ? `${name.slice(0, 25)}...` : name;
}

function screenshotName() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(
    2,
    "0",
  )}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
  return `screenshot-${stamp}.png`;
}

function revokePreview(url?: string) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function revokeAttachmentPreviews(attachments: ComposerAttachment[]) {
  attachments.forEach((attachment) => revokePreview(attachment.previewUrl));
}

function isNativeAttachment(attachment: Pick<ComposerAttachment, "kind">) {
  return attachment.kind === "spreadsheet" || attachment.kind === "document";
}

function iconForFile(file: Pick<FileAsset, "kind">) {
  return file.kind === "image" ? "img" : "doc";
}

function fileContentHref(file: Pick<FileAsset, "id">) {
  return `/api/files/${encodeURIComponent(file.id)}/content`;
}

function fileDownloadHref(file: Pick<FileAsset, "id">) {
  return `/api/files/${encodeURIComponent(file.id)}/download`;
}

function toNodeText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => toNodeText(item)).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(value)) {
    return toNodeText(value.props.children);
  }

  return "";
}

function normalizeChatErrorMessage(message: string) {
  return internalStreamErrorPattern.test(message) ? interruptedReplyMessage : message;
}

function formatChatErrorMessage(message: string) {
  const normalizedMessage = normalizeChatErrorMessage(message);
  return normalizedMessage === interruptedReplyMessage ? normalizedMessage : `請求失敗：${normalizedMessage}`;
}

function appendCanceledReplyMessage(content: string) {
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${canceledReplyMessage}` : canceledReplyMessage;
}

function messageStatusLabel(message: UiMessage) {
  if (message.status === "failed") {
    return "回覆中斷";
  }

  if (message.status === "streaming") {
    switch (message.streamPhase) {
      case "requesting":
        return message.thinkingMode === "extended" ? "準備加長思考..." : "準備中...";
      case "thinking":
        return "加長思考中...";
      default:
        return "回覆中...";
    }
  }

  return "";
}

function conversationPhaseLabel(phase: ConversationStreamPhase) {
  switch (phase) {
    case "requesting":
    case "thinking":
      return "思考中";
    case "streaming":
      return "輸出中";
    case "failed":
      return "失敗";
    default:
      return "";
  }
}

function formatConversationPhaseLabel(phase: ConversationStreamPhase, activeReplyCount: number) {
  const label = conversationPhaseLabel(phase) || (phase === "completed" ? "Done" : "");

  if (!label) {
    return "";
  }

  return activeReplyCount > 1 && isConversationBusyPhase(phase) ? `${label} (${activeReplyCount})` : label;
}

function formatCodeLanguageLabel(language: string) {
  return language
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 4) {
        return part.toUpperCase();
      }

      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}

function getCodeLanguageInfo(className?: string) {
  const match = className?.match(/language-([\w-]+)/i)?.[1];

  if (!match) {
    return {
      label: "TEXT",
      prismLanguage: "text",
    };
  }

  const rawLanguage = match.toLowerCase();
  const aliasMap: Record<string, string> = {
    js: "javascript",
    jsx: "jsx",
    md: "markdown",
    plain: "text",
    plaintext: "text",
    py: "python",
    rb: "ruby",
    rs: "rust",
    sh: "bash",
    shell: "bash",
    text: "text",
    ts: "typescript",
    yml: "yaml",
  };
  const prismLanguage = aliasMap[rawLanguage] ?? rawLanguage;

  return {
    label: formatCodeLanguageLabel(rawLanguage),
    prismLanguage: Prism.languages[prismLanguage] ? prismLanguage : "text",
  };
}

function createDraftConversationKey() {
  return `${draftConversationPrefix}${crypto.randomUUID()}`;
}

function isDraftConversationKey(key: string) {
  return key.startsWith(draftConversationPrefix);
}

function isConversationBusyPhase(phase: ConversationStreamPhase) {
  return phase === "requesting" || phase === "thinking" || phase === "streaming";
}

function isReplyStreaming(message: UiMessage) {
  return message.role === "assistant" && message.status === "streaming";
}

function isPristineDraftConversation(state: ConversationState) {
  return (
    !state.conversationId &&
    state.ui.messages.length === 0 &&
    state.draft.input.trim().length === 0 &&
    state.draft.attachments.length === 0 &&
    !state.ui.awaitingConversationId &&
    !isConversationBusyPhase(state.ui.phase)
  );
}

function truncateQuickReplyLabel(value: string) {
  return value.length > 24 ? `${value.slice(0, 22)}...` : value;
}

function deriveConversationPhaseFromMessages(messages: UiMessage[]): ConversationStreamPhase {
  const activeReplies = messages.filter(isReplyStreaming);

  if (activeReplies.some((message) => message.streamPhase === "thinking")) {
    return "thinking";
  }

  if (activeReplies.some((message) => message.streamPhase === "requesting")) {
    return "requesting";
  }

  if (activeReplies.length > 0) {
    return "streaming";
  }

  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  if (!latestAssistant) {
    return "idle";
  }

  if (latestAssistant.status === "failed") {
    return "failed";
  }

  if (latestAssistant.status === "streaming") {
    return latestAssistant.streamPhase ?? "streaming";
  }

  return "completed";
}

function collectActiveReplyIds(messages: UiMessage[]) {
  return messages.filter(isReplyStreaming).map((message) => message.id);
}

function syncConversationUiState(ui: ConversationUiState): ConversationUiState {
  const activeReplyIds = collectActiveReplyIds(ui.messages);

  return {
    ...ui,
    activeReplyIds,
    phase: deriveConversationPhaseFromMessages(ui.messages),
  };
}

function createConversationState({
  conversationId = null,
  folderId = null,
  key,
  messages = [],
  modelConfigId = "",
  phase = "idle",
  statusMessage = "",
  thinkingMode = "standard",
}: {
  conversationId?: string | null;
  folderId?: string | null;
  key: ConversationKey;
  messages?: UiMessage[];
  modelConfigId?: string;
  phase?: ConversationStreamPhase;
  statusMessage?: string;
  thinkingMode?: ThinkingMode;
}): ConversationState {
  return {
    key,
    conversationId,
    draft: {
      attachments: [],
      folderId,
      input: "",
      modelConfigId,
      thinkingMode,
    },
    ui: {
      activeReplyIds: [],
      awaitingConversationId: false,
      loadToken: 0,
      messages,
      phase,
      statusMessage,
    },
  };
}

function toUiMessages(messages: PersistedConversationMessage[]): UiMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      id: message.id,
      dbMessageId: message.id,
      runId: message.runs?.[0]?.id,
      role: message.role as "user" | "assistant",
      content: message.content,
      status: message.status,
      providerName: message.provider?.name,
      modelId: message.modelConfig?.modelId,
      modelDisplayName: message.modelConfig?.displayName,
      providerResponseModel: message.providerResponseModel,
      streamPhase: message.status === "streaming" ? "streaming" : undefined,
      attachments: message.attachments,
    }));
}

function toMessageAttachments(attachments: ComposerAttachment[]) {
  return attachments
    .filter((attachment) => attachment.fileAssetId)
    .map((attachment, sortOrder) => {
      const parseStatus: FileAsset["parseStatus"] =
        attachment.status === "failed"
          ? "failed"
          : attachment.status === "queued" || attachment.status === "processing"
            ? attachment.status
            : "completed";

      return {
        id: attachment.localId,
        sortOrder,
        fileAsset: {
          id: attachment.fileAssetId ?? attachment.localId,
          kind: attachment.kind,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          parseStatus,
          parseError: attachment.parseError ?? null,
        },
      };
    });
}

function CodeBlock({ code, language, languageLabel }: { code: string; language: string; languageLabel: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyLabel = copyState === "copied" ? "Copied" : copyState === "failed" ? "Retry" : "Copy";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  return (
    <div className="chat-code-block">
      <div className="chat-code-block-head">
        <span className="chat-code-language">{languageLabel}</span>
        <button
          aria-label={`${copyLabel} code block`}
          className={`chat-code-copy ${copyState !== "idle" ? copyState : ""}`.trim()}
          onClick={() => void handleCopy()}
          type="button"
        >
          {copyLabel}
        </button>
      </div>
      <Highlight code={code} language={language} theme={softCodeTheme}>
        {({ className, tokens, getLineProps, getTokenProps }) => (
          <pre className={className}>
            <code>
              {tokens.map((line, lineIndex) => {
                const lineProps = getLineProps({ line });

                return (
                  <span
                    {...lineProps}
                    className={lineProps.className ? `${lineProps.className} chat-code-line` : "chat-code-line"}
                    key={lineIndex}
                  >
                    {line.map((token, tokenIndex) => (
                      <span key={tokenIndex} {...getTokenProps({ token })} />
                    ))}
                  </span>
                );
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}

function MarkdownPre({ children }: ComponentPropsWithoutRef<"pre">) {
  const codeElement = Array.isArray(children) ? children[0] : children;

  if (isValidElement<{ children?: ReactNode; className?: string }>(codeElement)) {
    const code = toNodeText(codeElement.props.children).replace(/\n$/, "");
    const { label, prismLanguage } = getCodeLanguageInfo(codeElement.props.className);

    return <CodeBlock code={code} language={prismLanguage} languageLabel={label} />;
  }

  return <pre>{children}</pre>;
}

const markdownComponents: Components = {
  a({ href, children, ...props }) {
    const isExternal = Boolean(href && /^(https?:)?\/\//i.test(href));

    return (
      <a href={href} rel={isExternal ? "noreferrer" : undefined} target={isExternal ? "_blank" : undefined} {...props}>
        {children}
      </a>
    );
  },
  code({ children, className, ...props }) {
    return (
      <code className={className ? `chat-inline-code ${className}` : "chat-inline-code"} {...props}>
        {children}
      </code>
    );
  },
  pre: MarkdownPre,
  table({ children }) {
    return (
      <div className="chat-markdown-table-wrap">
        <table>{children}</table>
      </div>
    );
  },
};

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatWorkspace({ isAdmin }: ChatWorkspaceProps) {
  const [conversationBootstrap] = useState(() => {
    const key = createDraftConversationKey();
    const state = createConversationState({ key });

    return {
      initialDraftKey: key,
      initialConversationStates: {
        [key]: state,
      } satisfies Record<ConversationKey, ConversationState>,
    };
  });
  const [models, setModels] = useState<ModelOption[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [folders, setFolders] = useState<ConversationFolder[]>([]);
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [activeConversationKey, setActiveConversationKey] = useState<ConversationKey>(conversationBootstrap.initialDraftKey);
  const [conversationStates, setConversationStates] = useState<Record<ConversationKey, ConversationState>>(
    conversationBootstrap.initialConversationStates,
  );
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([]);
  const [workspaceStatus, setWorkspaceStatus] = useState("");
  const [folderNameInput, setFolderNameInput] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [isSmartMenuOpen, setIsSmartMenuOpen] = useState(false);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImageState | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [workspaceBootstrap, setWorkspaceBootstrap] = useState<WorkspaceBootstrapState>(createWorkspaceBootstrapState);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const smartMenuRef = useRef<HTMLDivElement>(null);
  const conversationStatesRef = useRef<Record<ConversationKey, ConversationState>>(conversationBootstrap.initialConversationStates);
  const streamControllersRef = useRef<ReplyStreamControllerMap>({});
  const thinkingTimersRef = useRef<ReplyThinkingTimerMap>({});
  const hydrateTokensRef = useRef<Record<ConversationKey, number>>({});
  const previousBodyOverflowRef = useRef("");
  const workspaceBootstrapTokenRef = useRef(0);

  function commitConversationStates(next: Record<ConversationKey, ConversationState>) {
    conversationStatesRef.current = next;
    setConversationStates(next);
  }

  function updateConversationStates(
    updater: (current: Record<ConversationKey, ConversationState>) => Record<ConversationKey, ConversationState>,
  ) {
    const current = conversationStatesRef.current;
    const next = updater(current);

    if (next !== current) {
      commitConversationStates(next);
    }
  }

  function buildConversationStateForKey(
    key: ConversationKey,
    options: Partial<{
      conversationId: string | null;
      folderId: string | null;
      messages: UiMessage[];
      modelConfigId: string;
      phase: ConversationStreamPhase;
      statusMessage: string;
      thinkingMode: ThinkingMode;
    }> = {},
  ) {
    const activeSnapshot = conversationStatesRef.current[activeConversationKey];

    return createConversationState({
      key,
      conversationId: options.conversationId ?? (isDraftConversationKey(key) ? null : key),
      folderId: options.folderId ?? activeSnapshot?.draft.folderId ?? activeFolderId,
      messages: options.messages,
      modelConfigId: options.modelConfigId ?? activeSnapshot?.draft.modelConfigId ?? models[0]?.id ?? "",
      phase: options.phase,
      statusMessage: options.statusMessage,
      thinkingMode: options.thinkingMode ?? activeSnapshot?.draft.thinkingMode ?? "standard",
    });
  }

  function ensureConversationState(
    key: ConversationKey,
    options: Partial<{
      conversationId: string | null;
      folderId: string | null;
      messages: UiMessage[];
      modelConfigId: string;
      phase: ConversationStreamPhase;
      statusMessage: string;
      thinkingMode: ThinkingMode;
    }> = {},
  ) {
    const existing = conversationStatesRef.current[key];

    if (existing) {
      return existing;
    }

    const created = buildConversationStateForKey(key, options);
    commitConversationStates({ ...conversationStatesRef.current, [key]: created });
    return created;
  }

  function patchConversationState(
    key: ConversationKey,
    updater: (state: ConversationState) => ConversationState,
    options: Partial<{
      conversationId: string | null;
      folderId: string | null;
      messages: UiMessage[];
      modelConfigId: string;
      phase: ConversationStreamPhase;
      statusMessage: string;
      thinkingMode: ThinkingMode;
    }> = {},
  ) {
    const current = conversationStatesRef.current;
    const base = current[key] ?? buildConversationStateForKey(key, options);
    const candidateState = updater(base);

    if (candidateState === base) {
      return base;
    }

    const nextState = {
      ...candidateState,
      ui: syncConversationUiState(candidateState.ui),
    };

    if (current[key] === nextState) {
      return nextState;
    }

    commitConversationStates({ ...current, [key]: nextState });
    return nextState;
  }

  function patchConversationDraft(
    key: ConversationKey,
    updater: (draft: ConversationDraftState) => ConversationDraftState,
    options: Partial<{ conversationId: string | null; folderId: string | null; modelConfigId: string; thinkingMode: ThinkingMode }> = {},
  ) {
    return patchConversationState(
      key,
      (state) => ({
        ...state,
        draft: updater(state.draft),
      }),
      options,
    );
  }

  function patchConversationUi(
    key: ConversationKey,
    updater: (ui: ConversationUiState) => ConversationUiState,
    options: Partial<{
      conversationId: string | null;
      folderId: string | null;
      messages: UiMessage[];
      modelConfigId: string;
      phase: ConversationStreamPhase;
      statusMessage: string;
      thinkingMode: ThinkingMode;
    }> = {},
  ) {
    return patchConversationState(
      key,
      (state) => ({
        ...state,
        ui: updater(state.ui),
      }),
      options,
    );
  }

  function clearThinkingTimer(replyId: string) {
    const timer = thinkingTimersRef.current[replyId];

    if (timer) {
      window.clearTimeout(timer);
      delete thinkingTimersRef.current[replyId];
    }
  }

  function abortReplyStream(replyId: string) {
    const controller = streamControllersRef.current[replyId];

    if (controller) {
      controller.abort();
      delete streamControllersRef.current[replyId];
    }
  }

  function abortConversationReplies(key: ConversationKey) {
    const state = conversationStatesRef.current[key];

    if (!state) {
      return;
    }

    state.ui.activeReplyIds.forEach((replyId) => {
      clearThinkingTimer(replyId);
      abortReplyStream(replyId);
    });
  }

  async function cancelConversationReplies(key: ConversationKey) {
    const state = conversationStatesRef.current[key];

    if (!state || state.ui.activeReplyIds.length === 0) {
      return;
    }

    const activeMessages = state.ui.messages.filter((message) => state.ui.activeReplyIds.includes(message.id));
    activeMessages.forEach((message) => {
      clearThinkingTimer(message.id);
      abortReplyStream(message.id);
    });

    patchConversationState(key, (currentState) => ({
      ...currentState,
      ui: {
        ...currentState.ui,
        statusMessage: canceledReplyMessage,
        messages: currentState.ui.messages.map((message) =>
          state.ui.activeReplyIds.includes(message.id)
            ? {
                ...message,
                content: appendCanceledReplyMessage(message.content),
                status: "failed",
                streamPhase: "failed",
              }
            : message,
        ),
      },
    }));

    await Promise.all(
      activeMessages
        .map((message) => message.runId)
        .filter((runId): runId is string => Boolean(runId))
        .map((runId) =>
          fetch(`/api/chat/runs/${encodeURIComponent(runId)}/cancel`, {
            method: "POST",
          }).catch(() => undefined),
        ),
    );
  }

  function removeConversationState(key: ConversationKey) {
    abortConversationReplies(key);
    const current = conversationStatesRef.current;
    const state = current[key];

    if (!state) {
      return;
    }

    revokeAttachmentPreviews(state.draft.attachments);
    const next = { ...current };
    delete next[key];
    commitConversationStates(next);
    delete hydrateTokensRef.current[key];
  }

  function promoteConversationKey(fromKey: ConversationKey, toKey: ConversationKey) {
    if (fromKey === toKey) {
      return toKey;
    }

    const current = conversationStatesRef.current;
    const source = current[fromKey];

    if (!source) {
      return toKey;
    }

    const next = { ...current, [toKey]: { ...source, key: toKey, conversationId: toKey } };
    delete next[fromKey];
    commitConversationStates(next);

    if (hydrateTokensRef.current[fromKey]) {
      hydrateTokensRef.current[toKey] = hydrateTokensRef.current[fromKey];
      delete hydrateTokensRef.current[fromKey];
    }

    if (activeConversationKey === fromKey) {
      setActiveConversationKey(toKey);
    }

    return toKey;
  }

  function scheduleThinkingPhase(conversationKey: ConversationKey, assistantMessageId: string) {
    clearThinkingTimer(assistantMessageId);
    thinkingTimersRef.current[assistantMessageId] = window.setTimeout(() => {
      patchConversationState(conversationKey, (state) => {
        if (!state.ui.activeReplyIds.includes(assistantMessageId)) {
          return state;
        }

        return {
          ...state,
          ui: {
            ...state.ui,
            phase: "thinking",
            messages: state.ui.messages.map((message) =>
              message.id === assistantMessageId && message.status === "streaming"
                ? { ...message, streamPhase: "thinking" }
                : message,
            ),
          },
        };
      });
    }, extendedThinkingDelayMs);
  }

  function activeStreamingReplyCount() {
    return Object.values(conversationStatesRef.current).reduce((total, state) => total + state.ui.activeReplyIds.length, 0);
  }

  const activeConversationState =
    conversationStates[activeConversationKey] ??
    createConversationState({
      key: activeConversationKey,
      conversationId: isDraftConversationKey(activeConversationKey) ? null : activeConversationKey,
      folderId: activeFolderId,
      modelConfigId: models[0]?.id ?? "",
    });

  const selectedModel = models.find((model) => model.id === activeConversationState.draft.modelConfigId);
  const latestProviderResponseModel = (() => {
    for (let index = activeConversationState.ui.messages.length - 1; index >= 0; index -= 1) {
      const message = activeConversationState.ui.messages[index];

      if (message?.role === "assistant" && message.providerResponseModel) {
        return message.providerResponseModel;
      }
    }

    return null;
  })();
  const completedRecentFiles = files.filter((file) => file.parseStatus === "completed" && !file.deletedAt).slice(0, 8);
  const unfiledConversations = conversations.filter((conversation) => !conversation.folderId);
  const activeReplyCount = activeConversationState.ui.activeReplyIds.length;
  const activeConversationBusy = activeReplyCount > 0;
  const waitingForConversationId =
    isDraftConversationKey(activeConversationKey) &&
    !activeConversationState.conversationId &&
    activeConversationState.ui.awaitingConversationId;
  const globalReplyLimitReached =
    Object.values(conversationStates).reduce((total, state) => total + state.ui.activeReplyIds.length, 0) >=
    maxConcurrentConversationStreams;
  const canSend =
    Boolean(activeConversationState.draft.modelConfigId) &&
    !waitingForConversationId &&
    !globalReplyLimitReached &&
    (activeConversationState.draft.input.trim().length > 0 || activeConversationState.draft.attachments.length > 0);
  const thinkingLabel = thinkingOptions.find((option) => option.id === activeConversationState.draft.thinkingMode)?.label ?? "標準";
  const currentConversation = conversations.find((conversation) => conversation.id === activeConversationState.conversationId);
  const activeFolder = folders.find((folder) => folder.id === (activeConversationState.draft.folderId ?? activeFolderId));
  const headerTitle = currentConversation?.title ?? (activeFolder ? `${activeFolder.name} 的新對話` : "新對話");
  const composerStatus = activeConversationState.ui.statusMessage || workspaceStatus;
  const workspaceBootstrapBusy = workspaceBootstrap.phase === "loading" || workspaceBootstrap.phase === "retrying";
  const modelsBootstrap = workspaceBootstrap.resources.models;
  const modelStatusText = selectedModel
    ? `${selectedModel.providerName} / ${selectedModel.displayName}`
    : modelsBootstrap.phase === "loading" || modelsBootstrap.phase === "retrying"
      ? "正在載入模型設定…"
      : modelsBootstrap.phase === "failed"
        ? "模型資料載入失敗，請重新載入。"
        : "尚未配置可用模型";
  const emptyChatTitle =
    activeConversationState.ui.messages.length === 0 && workspaceBootstrap.phase !== "ready"
      ? workspaceBootstrap.phase === "failed"
        ? "工作區資料尚未恢復"
        : "正在恢復工作區…"
      : "有什麼可以幫你？";
  const emptyChatDescription =
    activeConversationState.ui.messages.length === 0 && workspaceBootstrap.phase !== "ready"
      ? workspaceBootstrap.message || "正在重新讀取模型、對話、Project 與檔案資料。"
      : "可以貼上截圖、拖入圖片，或加入文件一起問。";

  async function fetchFiles() {
    const data = await fetchJsonNoStore<{ files: FileAsset[] }>("/api/files");
    return data.files;
  }

  async function loadModels() {
    const data = await fetchJsonNoStore<{ models: ModelOption[] }>("/api/models");
    setModels(data.models);

    const firstModelId = data.models[0]?.id ?? "";

    if (!firstModelId) {
      return;
    }

    updateConversationStates((current) => {
      let changed = false;
      const next: Record<ConversationKey, ConversationState> = {};

      for (const [key, state] of Object.entries(current)) {
        if (state.draft.modelConfigId) {
          next[key] = state;
          continue;
        }

        changed = true;
        next[key] = {
          ...state,
          draft: {
            ...state.draft,
            modelConfigId: firstModelId,
          },
        };
      }

      return changed ? next : current;
    });
  }

  async function loadConversations() {
    const data = await fetchJsonNoStore<{ conversations: ConversationItem[] }>("/api/conversations");
    setConversations(data.conversations);
  }

  async function loadFolders() {
    const response = await fetch("/api/conversation-folders");

    if (!response.ok) {
      setWorkspaceStatus("讀取 Project 失敗。");
      return;
    }

    const data = (await response.json()) as { folders: ConversationFolder[] };
    setFolders(data.folders);
  }

  async function loadFiles() {
    const nextFiles = await fetchFiles();
    setFiles(nextFiles);
  }

  async function loadFoldersBootstrap() {
    const data = await fetchJsonNoStore<{ folders: ConversationFolder[] }>("/api/conversation-folders");
    setFolders(data.folders);
  }

  async function bootstrapWorkspace() {
    const token = ++workspaceBootstrapTokenRef.current;
    const resourceStates = createWorkspaceBootstrapResources();
    let pending = [...workspaceBootstrapResourceKeys];

    for (let attempt = 1; attempt <= workspaceBootstrapMaxAttempts && pending.length > 0; attempt += 1) {
      if (workspaceBootstrapTokenRef.current !== token) {
        return;
      }

      const phase: BootstrapPhase = attempt === 1 ? "loading" : "retrying";
      pending.forEach((resource) => {
        resourceStates[resource] = {
          message:
            attempt === 1
              ? `正在讀取${workspaceBootstrapResourceLabels[resource]}…`
              : `正在重試${workspaceBootstrapResourceLabels[resource]}…`,
          phase,
        };
      });

      setWorkspaceBootstrap({
        attempt,
        message:
          attempt === 1
            ? "正在載入工作區資料…"
            : `工作區初始化失敗，正在重試（${attempt}/${workspaceBootstrapMaxAttempts}）…`,
        phase,
        resources: { ...resourceStates },
      });

      const nextPending: WorkspaceBootstrapResourceKey[] = [];
      const terminalFailures: Array<{ key: WorkspaceBootstrapResourceKey; message: string }> = [];

      for (const resource of pending) {
        try {
          if (resource === "models") {
            await loadModels();
          } else if (resource === "conversations") {
            await loadConversations();
          } else if (resource === "folders") {
            await loadFoldersBootstrap();
          } else {
            await loadFiles();
          }

          resourceStates[resource] = {
            message: "",
            phase: "ready",
          };
        } catch (error) {
          const errorMessage = describeBootstrapError(error);
          resourceStates[resource] = {
            message: errorMessage,
            phase: "failed",
          };

          if (!shouldRetryBootstrapError(error) || attempt === workspaceBootstrapMaxAttempts) {
            terminalFailures.push({ key: resource, message: errorMessage });
          } else {
            nextPending.push(resource);
          }
        }
      }

      if (workspaceBootstrapTokenRef.current !== token) {
        return;
      }

      if (terminalFailures.length > 0) {
        const failureSummary = terminalFailures
          .map(({ key, message }) => `${workspaceBootstrapResourceLabels[key]}：${message}`)
          .join("；");

        setWorkspaceBootstrap({
          attempt,
          message: `工作區載入失敗：${failureSummary}`,
          phase: "failed",
          resources: { ...resourceStates },
        });
        setWorkspaceStatus(
          terminalFailures.some(({ key }) => key === "models")
            ? "模型資料載入失敗，請重新載入。"
            : "工作區資料載入失敗，請重新載入。",
        );
        return;
      }

      if (nextPending.length === 0) {
        setWorkspaceBootstrap({
          attempt,
          message: "",
          phase: "ready",
          resources: { ...resourceStates },
        });
        setWorkspaceStatus("");
        return;
      }

      pending = nextPending;
      await new Promise((resolve) => window.setTimeout(resolve, bootstrapRetryDelayMs(attempt)));
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void bootstrapWorkspace();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      workspaceBootstrapTokenRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node | null;

      if (target && !attachmentMenuRef.current?.contains(target)) {
        setIsAttachmentMenuOpen(false);
      }

      if (target && !smartMenuRef.current?.contains(target)) {
        setIsSmartMenuOpen(false);
      }

      const targetElement = target instanceof Element ? target : target?.parentElement;

      if (!targetElement?.closest("[data-conversation-menu]")) {
        setOpenConversationMenuId(null);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAttachmentMenuOpen(false);
        setIsSmartMenuOpen(false);
        setOpenConversationMenuId(null);
        setIsDraggingOver(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!previewImage) {
      return;
    }

    previousBodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPreviewImage(null);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflowRef.current;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [previewImage]);

  useEffect(
    () => () => {
      Object.values(streamControllersRef.current).forEach((controller) => controller.abort());
      Object.values(thinkingTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      Object.values(conversationStatesRef.current).forEach((state) => revokeAttachmentPreviews(state.draft.attachments));
    },
    [],
  );

  function mergeHydratedMessages(localMessages: UiMessage[], persistedMessages: PersistedConversationMessage[]) {
    const persistedUiMessages = toUiMessages(persistedMessages);
    const localByPersistedId = new Map<string, UiMessage>();
    const unmatchedLocalMessages: UiMessage[] = [];

    for (const localMessage of localMessages) {
      const persistedId = localMessage.dbMessageId ?? (!isDraftConversationKey(localMessage.id) ? localMessage.id : undefined);

      if (persistedId) {
        localByPersistedId.set(persistedId, localMessage);
        continue;
      }

      unmatchedLocalMessages.push(localMessage);
    }

    const mergedMessages = persistedUiMessages.map((persistedMessage) => {
      const localMessage = localByPersistedId.get(persistedMessage.id);

      if (!localMessage) {
        return persistedMessage;
      }

      if (localMessage.role === "assistant" && localMessage.status === "streaming" && streamControllersRef.current[localMessage.id]) {
        return {
          ...persistedMessage,
          ...localMessage,
          dbMessageId: persistedMessage.id,
          providerName: localMessage.providerName ?? persistedMessage.providerName,
          modelId: localMessage.modelId ?? persistedMessage.modelId,
          modelDisplayName: localMessage.modelDisplayName ?? persistedMessage.modelDisplayName,
          providerResponseModel: persistedMessage.providerResponseModel ?? localMessage.providerResponseModel,
          attachments: localMessage.attachments.length > 0 ? localMessage.attachments : persistedMessage.attachments,
        };
      }

      return {
        ...localMessage,
        ...persistedMessage,
        id: localMessage.id,
        dbMessageId: persistedMessage.id,
        runId: localMessage.runId ?? persistedMessage.runId,
        artifactSaved: localMessage.artifactSaved,
      };
    });

    return [...mergedMessages, ...unmatchedLocalMessages];
  }

  async function hydrateConversation(conversationId: string) {
    const token = (hydrateTokensRef.current[conversationId] ?? 0) + 1;
    hydrateTokensRef.current[conversationId] = token;

    const response = await fetch(`/api/conversations/${conversationId}/messages`);

    if (!response.ok) {
      patchConversationUi(conversationId, (ui) => ({
        ...ui,
        statusMessage: "讀取對話失敗。",
      }));
      return;
    }

    const data = (await response.json()) as { messages: PersistedConversationMessage[] };

    if (hydrateTokensRef.current[conversationId] !== token) {
      return;
    }

    const nextMessages = toUiMessages(data.messages);
    patchConversationState(
      conversationId,
      (state) => {
        if (state.ui.activeReplyIds.length > 0) {
          return {
            ...state,
            conversationId,
            ui: {
              ...syncConversationUiState({
                ...state.ui,
                messages: mergeHydratedMessages(state.ui.messages, data.messages),
              }),
              loadToken: token,
            },
          };
        }

        return {
          ...state,
          conversationId,
          ui: {
            ...state.ui,
            loadToken: token,
            messages: nextMessages,
            phase: deriveConversationPhaseFromMessages(nextMessages),
            statusMessage: "",
          },
        };
      },
      { conversationId },
    );
  }

  useEffect(() => {
    const conversationId = activeConversationState.conversationId;

    if (!conversationId) {
      return;
    }

    const needsPolling = activeConversationState.ui.messages.some(
      (message) => message.status === "streaming" && !streamControllersRef.current[message.id],
    );

    if (!needsPolling) {
      return;
    }

    const interval = window.setInterval(() => {
      void hydrateConversation(conversationId);
    }, 1500);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationKey, activeConversationState.conversationId, activeConversationState.ui.messages]);

  function openConversation(conversation: ConversationItem) {
    setActiveConversationKey(conversation.id);
    setActiveFolderId(conversation.folderId);
    setWorkspaceStatus("");
    ensureConversationState(conversation.id, {
      conversationId: conversation.id,
      folderId: conversation.folderId,
    });
    void hydrateConversation(conversation.id);
  }

  function startNewConversation(folderId = activeFolderId) {
    const activeSnapshot = conversationStatesRef.current[activeConversationKey];

    if (activeSnapshot && isDraftConversationKey(activeConversationKey) && isPristineDraftConversation(activeSnapshot)) {
      patchConversationState(activeConversationKey, () =>
        createConversationState({
          key: activeConversationKey,
          conversationId: null,
          folderId,
          modelConfigId: activeSnapshot.draft.modelConfigId || models[0]?.id || "",
          thinkingMode: activeSnapshot.draft.thinkingMode,
        }),
      );
      setActiveFolderId(folderId);
      setWorkspaceStatus("");
      return;
    }

    const nextKey = createDraftConversationKey();
    const seedModelId = activeSnapshot?.draft.modelConfigId || models[0]?.id || "";
    const seedThinkingMode = activeSnapshot?.draft.thinkingMode ?? "standard";
    const nextState = createConversationState({
      key: nextKey,
      conversationId: null,
      folderId,
      modelConfigId: seedModelId,
      thinkingMode: seedThinkingMode,
    });

    commitConversationStates({ ...conversationStatesRef.current, [nextKey]: nextState });
    setActiveConversationKey(nextKey);
    setActiveFolderId(folderId);
    setWorkspaceStatus("");
  }

  async function deleteConversation(id: string) {
    await cancelConversationReplies(id);

    const response = await fetch(`/api/conversations/${id}`, { method: "DELETE" });

    if (!response.ok) {
      setWorkspaceStatus(await response.text());
      return;
    }

    if (activeConversationKey === id) {
      const deletedState = conversationStatesRef.current[id];
      startNewConversation(deletedState?.draft.folderId ?? activeFolderId);
    }

    removeConversationState(id);
    setWorkspaceStatus("對話已刪除。");
    await Promise.all([loadConversations(), loadFiles()]);
  }

  async function createFolder() {
    const name = folderNameInput.trim();

    if (!name) {
      return;
    }

    const response = await fetch("/api/conversation-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      setWorkspaceStatus(await response.text());
      return;
    }

    const data = (await response.json()) as { folder: ConversationFolder };
    setFolderNameInput("");
    setActiveFolderId(data.folder.id);
    setExpandedFolderIds((current) => Array.from(new Set([...current, data.folder.id])));
    await loadFolders();
  }

  async function renameFolder(folder: ConversationFolder) {
    const name = window.prompt("Project name", folder.name)?.trim();

    if (!name || name === folder.name) {
      return;
    }

    const response = await fetch(`/api/conversation-folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setWorkspaceStatus(response.ok ? "Project 已更新。" : await response.text());
    await loadFolders();
  }

  async function deleteFolder(folder: ConversationFolder) {
    if (!window.confirm(`Delete project "${folder.name}"? Conversations will move back to Recent.`)) {
      return;
    }

    const response = await fetch(`/api/conversation-folders/${folder.id}`, { method: "DELETE" });

    if (!response.ok) {
      setWorkspaceStatus(await response.text());
      return;
    }

    if (activeFolderId === folder.id) {
      setActiveFolderId(null);
    }

    updateConversationStates((current) => {
      let changed = false;
      const next: Record<ConversationKey, ConversationState> = {};

      for (const [key, state] of Object.entries(current)) {
        if (state.draft.folderId !== folder.id) {
          next[key] = state;
          continue;
        }

        changed = true;
        next[key] = {
          ...state,
          draft: {
            ...state.draft,
            folderId: null,
          },
        };
      }

      return changed ? next : current;
    });

    setExpandedFolderIds((current) => current.filter((id) => id !== folder.id));
    setWorkspaceStatus("Project 已刪除，對話已移回 Recent。");
    await Promise.all([loadFolders(), loadConversations()]);
  }

  async function moveConversationToFolder(id: string, folderId: string | null) {
    const response = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });

    if (!response.ok) {
      setWorkspaceStatus(await response.text());
      return;
    }

    patchConversationDraft(id, (draft) => ({ ...draft, folderId }), { conversationId: id, folderId });

    if (activeConversationKey === id) {
      setActiveFolderId(folderId);
    }

    setWorkspaceStatus(folderId ? "對話已移入 Project。" : "對話已移回 Recent。");
    await loadConversations();
  }

  function toggleFolder(folderId: string) {
    setActiveFolderId(folderId);
    setExpandedFolderIds((current) =>
      current.includes(folderId) ? current.filter((id) => id !== folderId) : [...current, folderId],
    );
  }

  function addFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) {
      return;
    }

    const state = ensureConversationState(activeConversationKey);

    if (isConversationBusyPhase(state.ui.phase) && state.ui.activeReplyIds.length === 0) {
      patchConversationUi(activeConversationKey, (ui) => ({
        ...ui,
        statusMessage: "這個對話正在回覆，請稍後再加附件。",
      }));
      return;
    }

    const accepted: ComposerAttachment[] = [];
    const rejected: string[] = [];

    for (const originalFile of nextFiles) {
      const kind = getUploadKind(originalFile.name, originalFile.type);

      if (!kind) {
        rejected.push(originalFile.name || "unknown");
        continue;
      }

      const file =
        kind === "image" && !originalFile.name
          ? new File([originalFile], screenshotName(), { type: originalFile.type || "image/png" })
          : originalFile;

      accepted.push({
        localId: crypto.randomUUID(),
        kind: kind as FileAssetKind,
        file,
        originalName: file.name,
        mimeType: file.type || (kind === "image" ? "image/png" : "application/octet-stream"),
        sizeBytes: file.size,
        previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
        status: "pending",
      });
    }

    if (accepted.length > 0) {
      patchConversationState(activeConversationKey, (currentState) => ({
        ...currentState,
        draft: {
          ...currentState.draft,
          attachments: [...currentState.draft.attachments, ...accepted],
        },
        ui: {
          ...currentState.ui,
          statusMessage: "",
        },
      }));
      setWorkspaceStatus("");
    }

    if (rejected.length > 0) {
      patchConversationUi(activeConversationKey, (ui) => ({
        ...ui,
        statusMessage: `這些檔案格式暫不支援：${rejected.join(", ")}`,
      }));
    }

    setIsAttachmentMenuOpen(false);
    setIsSmartMenuOpen(false);
  }

  function attachRecentFile(file: FileAsset) {
    patchConversationState(activeConversationKey, (state) => {
      if (state.draft.attachments.some((attachment) => attachment.fileAssetId === file.id)) {
        return state;
      }

      return {
        ...state,
        draft: {
          ...state.draft,
          attachments: [
            ...state.draft.attachments,
            {
              localId: crypto.randomUUID(),
              kind: file.kind,
              fileAssetId: file.id,
              originalName: file.originalName,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
              previewUrl: file.kind === "image" ? `/api/files/${file.id}/content` : undefined,
              status: "completed",
            },
          ],
        },
        ui: {
          ...state.ui,
          statusMessage: "",
        },
      };
    });

    setWorkspaceStatus("");
    setIsAttachmentMenuOpen(false);
    setIsSmartMenuOpen(false);
  }

  function removeAttachment(localId: string) {
    const attachment = conversationStatesRef.current[activeConversationKey]?.draft.attachments.find(
      (item) => item.localId === localId,
    );
    revokePreview(attachment?.previewUrl);

    patchConversationDraft(activeConversationKey, (draft) => ({
      ...draft,
      attachments: draft.attachments.filter((item) => item.localId !== localId),
    }));
  }

  async function uploadAttachment(conversationKey: ConversationKey, attachment: ComposerAttachment) {
    if (!attachment.file) {
      return attachment;
    }

    patchConversationDraft(conversationKey, (draft) => ({
      ...draft,
      attachments: draft.attachments.map((item) =>
        item.localId === attachment.localId ? { ...item, status: "uploading" } : item,
      ),
    }));

    const form = new FormData();
    form.set("file", attachment.file);
    const response = await fetch("/api/files", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const message = await response.text();
      patchConversationDraft(conversationKey, (draft) => ({
        ...draft,
        attachments: draft.attachments.map((item) =>
          item.localId === attachment.localId ? { ...item, status: "failed", parseError: message } : item,
        ),
      }));
      throw new Error(message);
    }

    const data = (await response.json()) as { file: FileAsset };
    const uploaded: ComposerAttachment = {
      ...attachment,
      file: undefined,
      fileAssetId: data.file.id,
      kind: data.file.kind,
      mimeType: data.file.mimeType,
      sizeBytes: data.file.sizeBytes,
      status: data.file.parseStatus,
      parseError: data.file.parseError,
      previewUrl: data.file.kind === "image" ? `/api/files/${data.file.id}/content` : attachment.previewUrl,
    };

    if (data.file.kind === "image") {
      revokePreview(attachment.previewUrl);
    }

    patchConversationDraft(conversationKey, (draft) => ({
      ...draft,
      attachments: draft.attachments.map((item) => (item.localId === attachment.localId ? uploaded : item)),
    }));

    return uploaded;
  }

  async function resolveAttachments(
    conversationKey: ConversationKey,
    attachments: ComposerAttachment[],
    model: ModelOption | undefined,
  ) {
    if (attachments.length === 0) {
      return [];
    }

    const nativeAttachments = attachments.filter(isNativeAttachment);
    const imageAttachments = attachments.filter((attachment) => attachment.kind === "image");

    if (imageAttachments.length > 0 && !model?.supportsImages) {
      throw new Error("這個模型目前不支援圖片輸入，請改選支援圖片的模型。");
    }

    if (nativeAttachments.length > 0) {
      const totalNativeBytes = nativeAttachments.reduce((total, attachment) => total + attachment.sizeBytes, 0);

      if (model?.providerApiStyle !== "openai_responses") {
        throw new Error("原生文件附件目前只支援 Responses API 類型的 provider。");
      }

      if (!model.supportsNativeFiles) {
        throw new Error("這個模型目前不支援原生文件輸入，請改選支援文件的 OpenAI 模型。");
      }

      if (totalNativeBytes > nativeFileLimitBytes) {
        throw new Error("文件總大小超過 50MB，請先移除部分附件再試。");
      }
    }

    patchConversationUi(conversationKey, (ui) => ({
      ...ui,
      statusMessage: "正在加入附件...",
    }));

    const uploadedAttachments = await Promise.all(
      attachments.map((attachment) => uploadAttachment(conversationKey, attachment)),
    );
    await loadFiles();
    return uploadedAttachments;
  }

  async function sendMessage(options: SendMessageOptions = {}) {
    const conversationKey = options.conversationKey ?? activeConversationKey;
    const currentState = ensureConversationState(conversationKey);
    const messageText = (options.messageOverride ?? currentState.draft.input).trim();
    const useDraftAttachments = options.useDraftAttachments ?? true;
    const draftAttachments = useDraftAttachments ? currentState.draft.attachments.map((attachment) => ({ ...attachment })) : [];
    const modelConfigId = currentState.draft.modelConfigId;
    const thinkingMode = currentState.draft.thinkingMode;
    const model = models.find((item) => item.id === modelConfigId);
    const isAwaitingConversationId =
      !currentState.conversationId && isDraftConversationKey(conversationKey) && currentState.ui.awaitingConversationId;

    if ((!messageText && draftAttachments.length === 0) || !modelConfigId) {
      return;
    }

    if (isAwaitingConversationId) {
      patchConversationUi(conversationKey, (ui) => ({
        ...ui,
        statusMessage: "Please wait for the conversation to start before sending another message.",
      }));
      return;
    }

    if (activeStreamingReplyCount() >= maxConcurrentConversationStreams) {
      patchConversationUi(conversationKey, (ui) => ({
        ...ui,
        statusMessage: `同時最多 ${maxConcurrentConversationStreams} 個對話在回覆，請先等待其中一個完成。`,
      }));
      return;
    }

    const userMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content:
        draftAttachments.length > 0
          ? `${messageText || "請根據附件內容進行分析。"}\n\n附件：${draftAttachments
              .map((attachment) => attachment.originalName)
              .join(", ")}`
          : messageText,
      status: "completed",
      attachments: toMessageAttachments(draftAttachments),
    };
    const assistantMessage: UiMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      status: "streaming",
      providerName: model?.providerName,
      modelId: model?.modelId,
      modelDisplayName: model?.displayName,
      thinkingMode,
      streamPhase: thinkingMode === "extended" ? "requesting" : "streaming",
      attachments: [],
    };

    patchConversationState(conversationKey, (state) => ({
      ...state,
      ui: {
        ...state.ui,
        messages: [...state.ui.messages, userMessage, assistantMessage],
        statusMessage: "",
        awaitingConversationId: !state.conversationId,
      },
      draft: options.messageOverride
        ? state.draft
        : {
            ...state.draft,
            attachments: useDraftAttachments ? [] : state.draft.attachments,
            input: "",
          },
    }));

    setWorkspaceStatus("");
    setIsAttachmentMenuOpen(false);
    setIsSmartMenuOpen(false);

    if (thinkingMode === "extended") {
      scheduleThinkingPhase(conversationKey, assistantMessage.id);
    }

    const abortController = new AbortController();
    streamControllersRef.current[assistantMessage.id] = abortController;

    let liveConversationKey = conversationKey;
    let responseConversationId = currentState.conversationId;

    try {
      const resolvedAttachments = await resolveAttachments(conversationKey, draftAttachments, model);
      const attachmentIds = resolvedAttachments
        .map((attachment) => attachment.fileAssetId)
        .filter((id): id is string => Boolean(id));
      const requestMessage = messageText || "請根據附件內容進行分析。";
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: currentState.conversationId,
          folderId: currentState.conversationId ? undefined : currentState.draft.folderId,
          modelConfigId,
          message: requestMessage,
          attachmentIds,
          reasoningEffort: thinkingMode,
        }),
        signal: abortController.signal,
      });

      const newConversationId = response.headers.get("x-conversation-id");
      responseConversationId = newConversationId ?? currentState.conversationId;
      const runId = response.headers.get("x-run-id");
      const assistantDbMessageId = response.headers.get("x-assistant-message-id");
      const requestedModelId = response.headers.get("x-requested-model-id");
      const requestedProviderName = response.headers.get("x-requested-provider-name");
      if (newConversationId) {
        liveConversationKey = promoteConversationKey(conversationKey, newConversationId);
      }

      patchConversationState(liveConversationKey, (state) => ({
        ...state,
        conversationId: responseConversationId,
        ui: {
          ...state.ui,
          awaitingConversationId: false,
          statusMessage: "",
          messages: state.ui.messages.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  runId: runId ?? message.runId,
                  dbMessageId: assistantDbMessageId ?? message.dbMessageId,
                  providerName: requestedProviderName ?? message.providerName,
                  modelId: requestedModelId ?? message.modelId,
                }
              : message,
          ),
        },
      }));

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || "Chat request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });

        if (!chunk) {
          continue;
        }

        clearThinkingTimer(assistantMessage.id);
        patchConversationState(liveConversationKey, (state) => {
          if (!conversationStatesRef.current[liveConversationKey]) {
            return state;
          }

          return {
            ...state,
            ui: {
              ...state.ui,
              statusMessage: "",
              messages: state.ui.messages.map((message) =>
                message.id === assistantMessage.id
                  ? {
                      ...message,
                      content: message.content + chunk,
                      streamPhase: "streaming",
                    }
                  : message,
              ),
            },
          };
        });
      }

      clearThinkingTimer(assistantMessage.id);
      delete streamControllersRef.current[assistantMessage.id];

      patchConversationState(liveConversationKey, (state) => ({
        ...state,
        ui: {
          ...state.ui,
          awaitingConversationId: false,
          statusMessage: "",
          messages: state.ui.messages.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  status: "completed",
                  streamPhase: "completed",
                }
              : message,
          ),
        },
      }));

      await loadConversations();

      if (responseConversationId) {
        void hydrateConversation(responseConversationId);
      }
    } catch (error) {
      clearThinkingTimer(assistantMessage.id);
      delete streamControllersRef.current[assistantMessage.id];

      if (!conversationStatesRef.current[liveConversationKey]) {
        return;
      }

      const rawMessage = error instanceof Error ? error.message : "未知錯誤";
      if (abortController.signal.aborted) {
        return;
      }

      const formattedMessage =
        thinkingMode === "extended" && /timed out|timeout/i.test(rawMessage)
          ? "加長思考逾時，請再試一次。"
          : formatChatErrorMessage(rawMessage);

      patchConversationState(liveConversationKey, (state) => ({
        ...state,
        draft:
          options.messageOverride || state.draft.input.trim().length > 0
            ? state.draft
            : {
                ...state.draft,
                input: messageText,
              },
        ui: {
          ...state.ui,
          awaitingConversationId: false,
          statusMessage: formattedMessage,
          messages: state.ui.messages.map((message) =>
            message.id === assistantMessage.id
              ? {
                  ...message,
                  status: "failed",
                  streamPhase: "failed",
                  content: message.content.trim().length > 0 ? `${message.content}\n\n${formattedMessage}` : formattedMessage,
                }
              : message,
          ),
        },
      }));

      if (responseConversationId) {
        await loadConversations().catch(() => undefined);
      }
    } finally {
      delete streamControllersRef.current[assistantMessage.id];
      clearThinkingTimer(assistantMessage.id);
    }
  }

  async function saveArtifact(message: UiMessage) {
    if (!message.runId || !message.content.trim()) {
      setWorkspaceStatus("這段回答缺少可追溯的 run，請刷新對話後再試。");
      return;
    }

    const response = await fetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: message.runId,
        title: message.content.split(/\s+/).slice(0, 8).join(" ").slice(0, 80) || "AI response",
        type: "markdown",
        inlineContent: message.content,
      }),
    });

    if (!response.ok) {
      setWorkspaceStatus(await response.text());
      return;
    }

    setWorkspaceStatus("已保存成 artifact。");
    patchConversationUi(activeConversationKey, (ui) => ({
      ...ui,
      messages: ui.messages.map((item) => (item.id === message.id ? { ...item, artifactSaved: true } : item)),
    }));
  }

  function onComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function onPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();
    addFiles(
      imageFiles.map((file) =>
        file.name ? file : new File([file], screenshotName(), { type: file.type || "image/png" }),
      ),
    );
  }

  function onDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    addFiles(Array.from(event.dataTransfer.files));
  }

  function openImagePreview(file: FileAsset) {
    if (file.kind !== "image" || file.deletedAt) {
      return;
    }

    setPreviewImage({
      contentHref: fileContentHref(file),
      downloadHref: fileDownloadHref(file),
      fileId: file.id,
      originalName: file.originalName,
    });
  }

  function renderConversationRow(conversation: ConversationItem) {
    const state = conversationStates[conversation.id];
    const rowPhase = state?.ui.phase ?? "idle";
    const rowActiveReplyCount = state?.ui.activeReplyIds.length ?? 0;
    const rowPhaseLabel = formatConversationPhaseLabel(rowPhase, rowActiveReplyCount);
    const isMenuOpen = openConversationMenuId === conversation.id;

    return (
      <div className="conversation-row" key={conversation.id}>
        <button
          className={conversation.id === activeConversationState.conversationId ? "active-item" : ""}
          onClick={() => openConversation(conversation)}
          type="button"
        >
          <span className="conversation-row-copy">
            <span className="conversation-row-title">{conversation.title}</span>
            {rowPhaseLabel ? <span className={`conversation-row-phase ${rowPhase}`}>{rowPhaseLabel}</span> : null}
          </span>
        </button>
        <details
          className="conversation-menu"
          data-conversation-menu
          onToggle={(event) => {
            setOpenConversationMenuId(event.currentTarget.open ? conversation.id : null);
            setIsAttachmentMenuOpen(false);
            setIsSmartMenuOpen(false);
          }}
          open={isMenuOpen}
        >
          <summary aria-label="對話選單">...</summary>
          <div className="conversation-menu-panel">
            <button
              type="button"
              onClick={() => {
                setOpenConversationMenuId(null);
                void moveConversationToFolder(conversation.id, null);
              }}
            >
              移到 Recent
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => {
                  setOpenConversationMenuId(null);
                  void moveConversationToFolder(conversation.id, folder.id);
                }}
              >
                移到 {folder.name}
              </button>
            ))}
            <button
              className="danger-text"
              type="button"
              onClick={() => {
                setOpenConversationMenuId(null);
                void deleteConversation(conversation.id);
              }}
            >
              刪除
            </button>
          </div>
        </details>
      </div>
    );
  }

  function renderMessageAttachments(message: UiMessage) {
    if (message.attachments.length === 0) {
      return null;
    }

    return (
      <div className="message-attachments">
        {message.attachments.map((attachment) => {
          const file = attachment.fileAsset;
          const unavailable = Boolean(file.deletedAt);
          const attachmentClasses = `message-attachment ${file.kind} ${unavailable ? "unavailable" : ""}`;

          if (!unavailable && file.kind !== "image") {
            return (
              <a className={`${attachmentClasses} downloadable`} download={file.originalName} href={fileDownloadHref(file)} key={attachment.id}>
                <span className="message-attachment-icon">{iconForFile(file)}</span>
                <span className="message-attachment-name">{shortName(file.originalName)}</span>
                <span className="message-attachment-action">Download</span>
              </a>
            );
          }

          return (
            <div className={attachmentClasses} key={attachment.id}>
              {file.kind === "image" && !unavailable ? (
                <button className="message-attachment-preview" onClick={() => openImagePreview(file)} type="button">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={file.originalName} src={fileContentHref(file)} />
                </button>
              ) : (
                <span className="message-attachment-icon">{iconForFile(file)}</span>
              )}
              {file.kind === "image" && !unavailable ? (
                <button className="message-attachment-name" onClick={() => openImagePreview(file)} type="button">
                  {shortName(file.originalName)}
                </button>
              ) : (
                <span className="message-attachment-name">{shortName(file.originalName)}</span>
              )}
              {unavailable ? <small>不可用</small> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={`chat-shell ${isDraggingOver ? "dragging" : ""} ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={onDrop}
    >
      <aside className="chat-sidebar">
        <div className="sidebar-fixed">
          <div className="sidebar-brand">
            <span className="brand-mark">AI</span>
            <span>Conversations</span>
            <button
              aria-label={isSidebarCollapsed ? "展開側欄" : "收起側欄"}
              className="sidebar-collapse-button"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              type="button"
            >
              {isSidebarCollapsed ? ">" : "<"}
            </button>
          </div>
          <button className="sidebar-row-button" type="button" onClick={() => startNewConversation(activeFolderId)}>
            <span>+</span>
            新對話
          </button>
        </div>

        <div className="sidebar-scroll">
          <div className="project-create">
            <input
              aria-label="新 Project 名稱"
              onChange={(event) => setFolderNameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createFolder();
                }
              }}
              placeholder="新 Project"
              value={folderNameInput}
            />
            <button type="button" onClick={() => void createFolder()}>
              +
            </button>
          </div>

          <div className="section-label">Projects</div>
          {folders.map((folder) => {
            const isExpanded = expandedFolderIds.includes(folder.id);
            const folderConversations = conversations.filter((conversation) => conversation.folderId === folder.id);

            return (
              <div className="project-group" key={folder.id}>
                <div className="project-head">
                  <button type="button" onClick={() => toggleFolder(folder.id)}>
                    {isExpanded ? "v" : ">"} {folder.name}
                  </button>
                  <button aria-label="Rename project" type="button" onClick={() => void renameFolder(folder)}>
                    rename
                  </button>
                  <button aria-label="Delete project" type="button" onClick={() => void deleteFolder(folder)}>
                    x
                  </button>
                </div>
                {isExpanded ? (
                  <div className="project-conversations">
                    <button className="mini-new-chat" type="button" onClick={() => startNewConversation(folder.id)}>
                      + 新對話
                    </button>
                    {folderConversations.map(renderConversationRow)}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="section-label">Recent</div>
          {unfiledConversations.map(renderConversationRow)}
        </div>

        <nav className="chat-sidebar-links">
          <Link href={getSettingsHref(isAdmin)}>{"\u2699 設定"}</Link>
        </nav>
      </aside>

      <section className="chat-main">
        {isDraggingOver ? <div className="drop-overlay">拖放文件或圖片以上傳</div> : null}
        <header className="chat-head">
          <div>
            <strong>{headerTitle}</strong>
            <div className="status-line">
              {modelStatusText}
              <span className="model-chip">response model: {latestProviderResponseModel ?? (activeConversationBusy ? "waiting..." : "-")}</span>
              {formatConversationPhaseLabel(activeConversationState.ui.phase, activeReplyCount) ? (
                <span className={`model-chip phase ${activeConversationState.ui.phase}`}>
                  {formatConversationPhaseLabel(activeConversationState.ui.phase, activeReplyCount)}
                </span>
              ) : null}
              {activeReplyCount > 0 ? (
                <button className="button secondary" onClick={() => void cancelConversationReplies(activeConversationKey)} type="button">
                  Stop
                </button>
              ) : null}
            </div>
            {workspaceBootstrap.phase !== "ready" && workspaceBootstrap.phase !== "idle" ? (
              <div className={`bootstrap-status ${workspaceBootstrap.phase === "failed" ? "failed" : "pending"} workspace-bootstrap-status`}>
                <span>{workspaceBootstrap.message}</span>
                <button
                  className="button secondary"
                  disabled={workspaceBootstrapBusy}
                  onClick={() => void bootstrapWorkspace()}
                  type="button"
                >
                  重新載入
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <div className="messages">
          {activeConversationState.ui.messages.length === 0 ? (
            <div className="empty-chat">
              <h2>{emptyChatTitle}</h2>
              <p>{emptyChatDescription}</p>
              {workspaceBootstrap.phase !== "ready" && workspaceBootstrap.phase !== "idle" ? (
                <div className="empty-chat-actions">
                  <button
                    className="button secondary"
                    disabled={workspaceBootstrapBusy}
                    onClick={() => void bootstrapWorkspace()}
                    type="button"
                  >
                    重新載入
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {activeConversationState.ui.messages.map((message) => {
            const quickReplies =
              message.role === "assistant" && message.status === "completed" ? extractQuickReplies(message.content) : [];

            return (
              <div key={message.id} className={`message ${message.role}`}>
                {renderMessageAttachments(message)}
                {message.role === "assistant" ? (
                  <MarkdownMessage content={message.content} />
                ) : (
                  <div className="message-text">{message.content}</div>
                )}
                {quickReplies.length > 0 ? (
                  <div className="quick-reply-strip">
                    {quickReplies.map((quickReply) => (
                      <button
                        className="quick-reply-chip"
                        disabled={waitingForConversationId || globalReplyLimitReached || !activeConversationState.draft.modelConfigId}
                        key={`${message.id}-${quickReply.source}-${quickReply.value}`}
                        onClick={() =>
                          void sendMessage({
                            conversationKey: activeConversationKey,
                            messageOverride: quickReply.value,
                            useDraftAttachments: false,
                          })
                        }
                        title={quickReply.value}
                        type="button"
                      >
                        {truncateQuickReplyLabel(quickReply.value)}
                      </button>
                    ))}
                  </div>
                ) : null}
                {message.role === "assistant" && message.status === "completed" && message.runId ? (
                  <div className="message-actions">
                    <button
                      className="button secondary"
                      disabled={message.artifactSaved}
                      onClick={() => void saveArtifact(message)}
                      type="button"
                    >
                      {message.artifactSaved ? "已保存" : "保存成 artifact"}
                    </button>
                  </div>
                ) : null}
                {message.status && message.status !== "completed" ? (
                  <div className={`message-status ${message.status}`}>{messageStatusLabel(message)}</div>
                ) : null}
              </div>
            );
          })}
        </div>

        <form
          className="composer-wrap"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage();
          }}
        >
          <div className="composer-box">
            {activeConversationState.draft.attachments.length > 0 ? (
              <div className="attachment-strip">
                {activeConversationState.draft.attachments.map((attachment) => (
                  <div className={`attachment-chip ${attachment.kind} ${attachment.status}`} key={attachment.localId}>
                    {attachment.kind === "image" && attachment.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={attachment.originalName} src={attachment.previewUrl} />
                    ) : (
                      <div className="attachment-icon" aria-hidden="true">
                        doc
                      </div>
                    )}
                    <div className="attachment-copy">
                      <span>{shortName(attachment.originalName)}</span>
                      <small>{attachmentStatusLabel(attachment.status)}</small>
                    </div>
                    <button
                      aria-label="移除附件"
                      className="chip-remove"
                      disabled={false}
                      onClick={() => removeAttachment(attachment.localId)}
                      type="button"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <textarea
              value={activeConversationState.draft.input}
              onChange={(event) =>
                patchConversationDraft(activeConversationKey, (draft) => ({
                  ...draft,
                  input: event.target.value,
                }))
              }
              onKeyDown={onComposerKeyDown}
              onPaste={onPaste}
              placeholder="有問題，隨時問"
              rows={1}
              disabled={false}
            />

            <div className="composer-actions">
              <div className="attachment-menu-wrap" ref={attachmentMenuRef}>
                <button
                  aria-label="加入附件"
                  className="round-tool-button"
                  disabled={false}
                  onClick={() => {
                    setIsAttachmentMenuOpen((current) => !current);
                    setOpenConversationMenuId(null);
                    setIsSmartMenuOpen(false);
                    void loadFiles();
                  }}
                  type="button"
                >
                  +
                </button>
                {isAttachmentMenuOpen ? (
                  <div className="attachment-menu">
                    <button type="button" onClick={() => documentInputRef.current?.click()}>
                      上傳文件
                    </button>
                    <button type="button" onClick={() => imageInputRef.current?.click()}>
                      上傳圖片
                    </button>
                    <div className="recent-files">
                      <strong>最近文件</strong>
                      {completedRecentFiles.length > 0 ? (
                        completedRecentFiles.map((file) => (
                          <button key={file.id} type="button" onClick={() => attachRecentFile(file)}>
                            {iconForFile(file)} {shortName(file.originalName)}
                          </button>
                        ))
                      ) : (
                        <span>暫時沒有可加入的文件</span>
                      )}
                    </div>
                  </div>
                ) : null}
                <input
                  accept={documentAccept}
                  className="hidden-file-input"
                  multiple
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = "";
                  }}
                  ref={documentInputRef}
                  type="file"
                />
                <input
                  accept={imageAccept}
                  className="hidden-file-input"
                  multiple
                  onChange={(event) => {
                    addFiles(Array.from(event.target.files ?? []));
                    event.currentTarget.value = "";
                  }}
                  ref={imageInputRef}
                  type="file"
                />
              </div>
              <div className="smart-menu-wrap" ref={smartMenuRef}>
                <button
                  aria-label="智能設定"
                  className="smart-pill"
                  disabled={false}
                  onClick={() => {
                    setIsSmartMenuOpen((current) => !current);
                    setIsAttachmentMenuOpen(false);
                    setOpenConversationMenuId(null);
                  }}
                  type="button"
                >
                  智能
                  <span>{thinkingLabel}</span>
                </button>
                {isSmartMenuOpen ? (
                  <div className="smart-menu">
                    <div className="smart-section">
                      <div className="smart-section-title">模型</div>
                      {models.length > 0 ? (
                        models.map((model) => (
                          <button
                            className={model.id === activeConversationState.draft.modelConfigId ? "selected" : ""}
                            key={model.id}
                            onClick={() =>
                              patchConversationDraft(activeConversationKey, (draft) => ({
                                ...draft,
                                modelConfigId: model.id,
                              }))
                            }
                            type="button"
                          >
                            <span>
                              <strong>{model.displayName}</strong>
                              <small>{model.providerName}</small>
                            </span>
                            <span>{model.id === activeConversationState.draft.modelConfigId ? "✓" : ""}</span>
                          </button>
                        ))
                      ) : (
                        <p className="smart-empty">尚未配置可用模型</p>
                      )}
                    </div>
                    <div className="smart-section">
                      <div className="smart-section-title">思考強度</div>
                      {thinkingOptions.map((option) => (
                        <button
                          className={option.id === activeConversationState.draft.thinkingMode ? "selected" : ""}
                          key={option.id}
                          onClick={() =>
                            patchConversationDraft(activeConversationKey, (draft) => ({
                              ...draft,
                              thinkingMode: option.id,
                            }))
                          }
                          type="button"
                        >
                          <span>
                            <strong>{option.label}</strong>
                            <small>{option.description}</small>
                            <small className="smart-option-detail">{option.detail}</small>
                          </span>
                          <span>{option.id === activeConversationState.draft.thinkingMode ? "✓" : ""}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <button aria-label="語音輸入" className="round-tool-button muted" disabled={false} type="button">
                <svg aria-hidden="true" height="17" viewBox="0 0 24 24" width="17">
                  <path
                    d="M12 14c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v5c0 1.66 1.34 3 3 3Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                  <path
                    d="M19 11a7 7 0 0 1-14 0M12 18v3"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  />
                </svg>
              </button>
              <button aria-label="送出" className="send-icon-button" disabled={!canSend} type="submit">
                →
              </button>
            </div>
          </div>
          {composerStatus ? <div className="composer-status">{composerStatus}</div> : null}
        </form>
      </section>
      {previewImage ? (
        <div
          aria-modal="true"
          className="image-preview-modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewImage(null);
            }
          }}
          role="dialog"
        >
          <button
            aria-label="關閉圖片預覽"
            className="image-preview-close"
            onClick={() => setPreviewImage(null)}
            type="button"
          >
            x
          </button>
          <div className="image-preview-stage" key={previewImage.fileId}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={previewImage.originalName} src={previewImage.contentHref} />
          </div>
          <div className="image-preview-actions">
            <span title={previewImage.originalName}>{shortName(previewImage.originalName)}</span>
            <a className="image-preview-save" download={previewImage.originalName} href={previewImage.downloadHref}>
              儲存
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
