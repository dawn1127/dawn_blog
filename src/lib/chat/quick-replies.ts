export type QuickReplyCandidate = {
  source: "list" | "quoted";
  value: string;
};

const followUpIntroPattern =
  /可直接跟進|下一步|直接選|直接回|我可以直接幫你做以下其中一種|我也可以直接幫你做以下其中一種|我可以以下一則直接補你|你可以直接回|你只要回我一句|你只要回覆一句/u;

const quotedReplyPatterns = [
  /(?:你只要回我一句|你只要回覆一句|你可以直接回|直接回我|直接回覆我|只要回我一句)\s*[：:]?\s*[「“"]([^"”」\n]{1,160})[”」"]/gu,
  /(?:你只要回我一句|你只要回覆一句|你可以直接回|直接回我|直接回覆我|只要回我一句)\s*[：:]?\s*`([^`\n]{1,160})`/gu,
  /(?:你只要回我一句|你只要回覆一句|你可以直接回|直接回我|直接回覆我|只要回我一句)\s*[：:]?\s*([^\n]{1,160})/gu,
];

function sanitizeCandidate(value: string) {
  return value
    .replace(/^[`"'“”‘’「」]+|[`"'“”‘’「」]+$/gu, "")
    .replace(/[。！!？?]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function truncateListItemPrefix(value: string) {
  return value.replace(/^(?:[-*+]\s+|\d+\.\s+)/u, "").trim();
}

function stripIgnoredSections(content: string) {
  return content
    .replace(/```[\s\S]*?```/gu, "\n")
    .replace(/~~~[\s\S]*?~~~/gu, "\n")
    .replace(/^\s*>.*$/gmu, "")
    .replace(/^\s*\|.*\|\s*$/gmu, "")
    .replace(/^\s*[:\-| ]+\s*$/gmu, "");
}

function extractQuotedReplies(content: string) {
  const candidates: QuickReplyCandidate[] = [];

  for (const pattern of quotedReplyPatterns) {
    for (const match of content.matchAll(pattern)) {
      const value = sanitizeCandidate(match[1] ?? "");

      if (value) {
        candidates.push({ source: "quoted", value });
      }
    }
  }

  return candidates;
}

function extractListReplies(content: string) {
  const lines = content.split(/\r?\n/u);
  const groups: Array<{ intro: string; items: string[] }> = [];
  let lastMeaningfulLine = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? "";

    if (!line) {
      continue;
    }

    const listMatch = line.match(/^(?:[-*+]\s+|\d+\.\s+)(.+)$/u);

    if (!listMatch) {
      lastMeaningfulLine = line;
      continue;
    }

    const items: string[] = [];
    let cursor = index;

    while (cursor < lines.length) {
      const currentLine = lines[cursor]?.trim() ?? "";
      const currentMatch = currentLine.match(/^(?:[-*+]\s+|\d+\.\s+)(.+)$/u);

      if (!currentMatch) {
        break;
      }

      const value = sanitizeCandidate(truncateListItemPrefix(currentLine));

      if (value) {
        items.push(value);
      }

      cursor += 1;
    }

    if (items.length > 0 && followUpIntroPattern.test(lastMeaningfulLine)) {
      groups.push({ intro: lastMeaningfulLine, items });
    }

    index = cursor - 1;
  }

  const matchedGroup = groups.at(-1);

  if (!matchedGroup) {
    return [];
  }

  return matchedGroup.items.map((value) => ({ source: "list" as const, value }));
}

export function extractQuickReplies(content: string) {
  const sanitized = stripIgnoredSections(content);
  const seen = new Set<string>();
  const candidates = [...extractQuotedReplies(sanitized), ...extractListReplies(sanitized)];
  const results: QuickReplyCandidate[] = [];

  for (const candidate of candidates) {
    const value = sanitizeCandidate(candidate.value);

    if (!value || seen.has(value)) {
      continue;
    }

    seen.add(value);
    results.push({ ...candidate, value });

    if (results.length >= 5) {
      break;
    }
  }

  return results;
}
