import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { enforceFixedWindowLimit } from "@/lib/rate-limit";
import { titleFromFirstMessage } from "@/lib/chat/title";
import { getProviderAdapter } from "@/lib/provider";
import type { ChatContentPart, ChatMessageInput } from "@/lib/provider/types";
import { decryptSecret } from "@/lib/security/crypto";
import { getEnv } from "@/lib/env";
import { getStorageClient } from "@/lib/storage";
import { streamToBuffer } from "@/lib/storage/read-object";
import { getDocumentMode } from "@/lib/settings";
import { isNativeFileKind } from "@/lib/file-types";
import { isActiveChatRunCanceled, registerActiveChatRun, unregisterActiveChatRun } from "@/lib/chat/active-runs";

const chatSchema = z.object({
  conversationId: z.string().optional().nullable(),
  folderId: z.string().optional().nullable(),
  modelConfigId: z.string().min(1),
  message: z.string().min(1),
  attachmentIds: z.array(z.string()).default([]),
  reasoningEffort: z.enum(["standard", "extended"]).default("standard"),
});

function truncateContext(value: unknown, maxLength = 12000) {
  const text = JSON.stringify(value, null, 2);
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...truncated` : text;
}

const publicStreamInterruptedMessage = "回覆中斷，請再試一次。";

function isAbortLikeError(error: unknown) {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return error instanceof Error && error.name === "AbortError";
}

function isClosedControllerError(error: unknown) {
  return error instanceof Error && /controller is already closed|invalid state/i.test(error.message);
}

function toPublicChatErrorMessage(message: string) {
  return /controller is already closed|invalid state|readablestream/i.test(message)
    ? publicStreamInterruptedMessage
    : message;
}

const canceledReplyMessage = "已停止回覆";
const partialFlushIntervalMs = 500;
const partialFlushCharacterDelta = 300;

function appendCanceledMessage(content: string) {
  const trimmed = content.trim();
  return trimmed ? `${trimmed}\n\n${canceledReplyMessage}` : canceledReplyMessage;
}

async function fileToImagePart(file: {
  storageKey: string;
  mimeType: string;
}): Promise<Extract<ChatContentPart, { type: "image" }>> {
  const objectStream = await getStorageClient().getObject(getEnv().S3_BUCKET, file.storageKey);
  const bytes = await streamToBuffer(objectStream);

  return {
    type: "image",
    mimeType: file.mimeType,
    base64Data: bytes.toString("base64"),
    detail: "auto",
  };
}

async function fileToNativeFilePart(file: {
  storageKey: string;
  mimeType: string;
  originalName: string;
}): Promise<Extract<ChatContentPart, { type: "file" }>> {
  const objectStream = await getStorageClient().getObject(getEnv().S3_BUCKET, file.storageKey);
  const bytes = await streamToBuffer(objectStream);

  return {
    type: "file",
    filename: file.originalName,
    mimeType: file.mimeType,
    base64Data: bytes.toString("base64"),
  };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  await enforceFixedWindowLimit({
    key: `chat:${user.id}`,
    limit: 20,
    windowSeconds: 60,
  });

  const body = chatSchema.parse(await request.json());
  const db = getDb();
  const model = await db.modelConfig.findFirst({
    where: {
      id: body.modelConfigId,
      enabled: true,
      provider: {
        enabled: true,
      },
    },
    include: { provider: true },
  });

  if (!model) {
    return new Response("Model is not available", { status: 400 });
  }

  const attachedFiles =
    body.attachmentIds.length > 0
      ? await db.fileAsset.findMany({
          where: {
            id: { in: body.attachmentIds },
            ownerId: user.id,
            deletedAt: null,
            parseStatus: "completed",
          },
          include: {
            index: true,
          },
        })
      : [];

  if (body.attachmentIds.length !== attachedFiles.length) {
    return new Response("One or more files are unavailable for retrieval", { status: 400 });
  }

  const fileById = new Map(attachedFiles.map((file) => [file.id, file]));
  const orderedAttachedFiles = body.attachmentIds
    .map((fileAssetId) => fileById.get(fileAssetId))
    .filter((file): file is (typeof attachedFiles)[number] => Boolean(file));
  const nativeFiles = orderedAttachedFiles.filter((file) => isNativeFileKind(file.kind));
  const imageFiles = orderedAttachedFiles.filter((file) => file.kind === "image");
  const documentMode = await getDocumentMode();

  if (nativeFiles.length > 0) {
    const totalNativeBytes = nativeFiles.reduce((total, file) => total + file.sizeBytes, 0);

    if (documentMode !== "openai_native") {
      return new Response("目前只開啟 OpenAI 原生文件模式。", { status: 400 });
    }

    if (model.provider.apiStyle !== "openai_responses") {
      return new Response("OpenAI 原生文件只支援 Responses API 風格 provider。", { status: 400 });
    }

    if (!model.supportsNativeFiles) {
      return new Response("這個模型未開啟文件讀取，請在設定選擇支援文件的 OpenAI 模型。", { status: 400 });
    }

    if (totalNativeBytes > 50 * 1024 * 1024) {
      return new Response("文件總大小超過 50MB，請減少附件後再試。", { status: 413 });
    }
  }

  if (imageFiles.length > 0 && !model.supportsImages) {
    return new Response("Selected model does not support image input", { status: 400 });
  }

  let folderId: string | null = null;

  if (!body.conversationId && body.folderId) {
    const folder = await db.conversationFolder.findFirst({
      where: {
        id: body.folderId,
        userId: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!folder) {
      return new Response("Project not found", { status: 404 });
    }

    folderId = folder.id;
  }

  const conversation =
    body.conversationId
      ? await db.conversation.findFirst({
          where: {
            id: body.conversationId,
            userId: user.id,
            deletedAt: null,
          },
        })
      : await db.conversation.create({
          data: {
            userId: user.id,
            folderId,
            title: titleFromFirstMessage(body.message),
            lastMessageAt: new Date(),
            defaultProviderId: model.providerId,
            defaultModelConfigId: model.id,
          },
        });

  if (!conversation) {
    return new Response("Conversation not found", { status: 404 });
  }

  const userMessage = await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      status: "completed",
      content: body.message,
      providerId: model.providerId,
      modelConfigId: model.id,
    },
  });

  if (attachedFiles.length > 0) {
    await db.messageAttachment.createMany({
      data: body.attachmentIds
        .map((fileAssetId, sortOrder) => {
          const file = fileById.get(fileAssetId);

          return file
            ? {
                messageId: userMessage.id,
                fileAssetId: file.id,
                sortOrder,
              }
            : null;
        })
        .filter((item): item is { messageId: string; fileAssetId: string; sortOrder: number } => Boolean(item)),
      skipDuplicates: true,
    });
  }

  await db.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });

  const run = await db.run.create({
    data: {
      userId: user.id,
      toolId: "network-chat",
      conversationId: conversation.id,
      messageId: userMessage.id,
      providerId: model.providerId,
      modelConfigId: model.id,
      status: "running",
      inputFileIds: body.attachmentIds,
      startedAt: new Date(),
    },
  });

  const history = await db.message.findMany({
    where: {
      conversationId: conversation.id,
      status: "completed",
      role: { in: ["user", "assistant"] },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const localParsedFiles =
    documentMode === "local_parse" ? orderedAttachedFiles.filter((file) => file.kind === "spreadsheet") : [];
  const fileContext =
    localParsedFiles.length > 0
      ? [
          {
            role: "system" as const,
            content:
              "Use the following parsed Excel/CSV context as the source of truth. " +
              "When answering, cite sheet names, columns, row ranges, or chunk ids when relevant.\n\n" +
              truncateContext(
                localParsedFiles.map((file) => ({
                  fileId: file.id,
                  filename: file.originalName,
                  sheetSummaries: file.index?.sheetSummaries,
                  columnSummaries: file.index?.columnSummaries,
                  sampleRows: file.index?.sampleRows,
                  chunks: file.index?.chunks,
                  deterministicFindings: file.index?.deterministicFindings,
                })),
              ),
          },
        ]
      : [];

  const imageParts = await Promise.all(imageFiles.map((file) => fileToImagePart(file)));
  const nativeFileParts = await Promise.all(nativeFiles.map((file) => fileToNativeFilePart(file)));

  const messages: ChatMessageInput[] = [
    ...fileContext,
    ...history.map((message) => ({
      role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content:
        message.id === userMessage.id && (imageParts.length > 0 || nativeFileParts.length > 0)
          ? ([{ type: "text", text: message.content }, ...imageParts, ...nativeFileParts] satisfies ChatContentPart[])
          : message.content,
    })),
  ];

  const adapter = getProviderAdapter(model.provider.apiStyle);
  const apiKey = decryptSecret(model.provider.apiKeyEncrypted);
  const shouldStream = model.supportsStreaming;
  const timeoutMs = body.reasoningEffort === "extended" ? 180000 : 60000;
  const assistantMessage = await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      status: "streaming",
      content: "",
      providerId: model.providerId,
      modelConfigId: model.id,
    },
  });

  await db.run.update({
    where: { id: run.id },
    data: { messageId: assistantMessage.id },
  });

  const headers = new Headers({
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-cache",
    "x-conversation-id": conversation.id,
    "x-run-id": run.id,
    "x-assistant-message-id": assistantMessage.id,
    "x-requested-model-id": model.modelId,
    "x-requested-provider-name": model.provider.name,
    "x-response-mode": shouldStream ? "streaming" : "complete",
  });
  const providerAbortController = new AbortController();
  let clientAborted = request.signal.aborted;

  registerActiveChatRun(run.id, providerAbortController);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullText = "";
      let providerResponseModel: string | undefined;
      let streamClosed = false;
      const abortListener = () => {
        clientAborted = true;
        console.warn("[chat-stream] request aborted", {
          conversationId: conversation.id,
          runId: run.id,
        });
      };

      request.signal.addEventListener("abort", abortListener, { once: true });

      const safeEnqueue = (token: string) => {
        if (!token || streamClosed || clientAborted) {
          return;
        }

        try {
          controller.enqueue(encoder.encode(token));
        } catch (error) {
          if (isClosedControllerError(error)) {
            clientAborted = true;
            streamClosed = true;
            console.warn("[chat-stream] enqueue ignored after close", {
              conversationId: conversation.id,
              runId: run.id,
              message: error instanceof Error ? error.message : "Unknown stream error",
            });
            return;
          }

          throw error;
        }
      };

      const safeClose = () => {
        if (streamClosed) {
          return;
        }

        streamClosed = true;

        if (clientAborted) {
          return;
        }

        try {
          controller.close();
        } catch (error) {
          if (isClosedControllerError(error)) {
            console.warn("[chat-stream] close ignored after close", {
              conversationId: conversation.id,
              runId: run.id,
              message: error instanceof Error ? error.message : "Unknown stream error",
            });
            return;
          }

          throw error;
        }
      };

      const safeError = (error: unknown) => {
        if (streamClosed) {
          return;
        }

        streamClosed = true;

        if (clientAborted) {
          return;
        }

        try {
          controller.error(error);
        } catch (streamError) {
          if (isClosedControllerError(streamError)) {
            console.warn("[chat-stream] error ignored after close", {
              conversationId: conversation.id,
              runId: run.id,
              message: streamError instanceof Error ? streamError.message : "Unknown stream error",
            });
            return;
          }

          throw streamError;
        }
      };

      let lastFlushedText = "";
      let lastFlushAt = Date.now();
      const flushPartialContent = async (force = false) => {
        if (fullText === lastFlushedText) {
          return;
        }

        const shouldFlush =
          force ||
          Date.now() - lastFlushAt >= partialFlushIntervalMs ||
          fullText.length - lastFlushedText.length >= partialFlushCharacterDelta;

        if (!shouldFlush) {
          return;
        }

        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullText,
            providerResponseModel,
          },
        });
        lastFlushedText = fullText;
        lastFlushAt = Date.now();
      };

      try {
        if (shouldStream) {
          const result = await adapter.chatStream({
            baseUrl: model.provider.baseUrl,
            apiKey,
            modelId: model.modelId,
            messages,
            reasoningEffort: body.reasoningEffort,
            signal: providerAbortController.signal,
            timeoutMs,
            onToken: async (token) => {
              fullText += token;
              safeEnqueue(token);
              await flushPartialContent();
            },
          });
          providerResponseModel = result.responseModel;
        } else {
          const result = await adapter.chatComplete({
            baseUrl: model.provider.baseUrl,
            apiKey,
            modelId: model.modelId,
            messages,
            reasoningEffort: body.reasoningEffort,
            signal: providerAbortController.signal,
            timeoutMs,
          });
          fullText = result.content;
          providerResponseModel = result.responseModel;
          safeEnqueue(fullText);
        }

        await flushPartialContent(true);
        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullText,
            status: "completed",
            providerResponseModel,
          },
        });
        await db.run.update({
          where: { id: run.id },
          data: {
            status: "completed",
            completedAt: new Date(),
          },
        });
        safeClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown chat provider error";
        const publicMessage = toPublicChatErrorMessage(message);

        if (isAbortLikeError(error) && isActiveChatRunCanceled(run.id)) {
          const canceledContent = appendCanceledMessage(fullText);
          await db.message.update({
            where: { id: assistantMessage.id },
            data: {
              content: canceledContent,
              status: "failed",
              providerResponseModel,
              errorMessage: "Canceled by user",
            },
          });
          await db.run.update({
            where: { id: run.id },
            data: {
              status: "failed",
              errorMessage: "Canceled by user",
              completedAt: new Date(),
            },
          });
          safeClose();
          return;
        }

        await flushPartialContent(true);
        await db.message.update({
          where: { id: assistantMessage.id },
          data: {
            content: fullText || publicMessage,
            status: "failed",
            errorMessage: message,
            providerResponseModel,
          },
        });
        await db.message.update({
          where: { id: userMessage.id },
          data: {
            errorMessage: message,
          },
        });
        await db.run.update({
          where: { id: run.id },
          data: {
            status: "failed",
            errorMessage: message,
            completedAt: new Date(),
          },
        });
        safeError(new Error(publicMessage));
      } finally {
        request.signal.removeEventListener("abort", abortListener);
        unregisterActiveChatRun(run.id);
      }
    },
    cancel() {
      clientAborted = true;
    },
  });

  return new Response(stream, { headers });
}
