import { anthropicMessagesAdapter } from "@/lib/provider/anthropic-messages";
import { openAiCompatibleAdapter } from "@/lib/provider/openai-compatible";
import { openAiResponsesAdapter } from "@/lib/provider/openai-responses";

export function getProviderAdapter(apiStyle: string) {
  if (apiStyle === "openai_compatible") {
    return openAiCompatibleAdapter;
  }

  if (apiStyle === "openai_responses") {
    return openAiResponsesAdapter;
  }

  if (apiStyle === "anthropic_messages") {
    return anthropicMessagesAdapter;
  }

  throw new Error(`Unsupported provider apiStyle: ${apiStyle}`);
}
