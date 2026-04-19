import { getDb } from "@/lib/db";

export type DocumentMode = "openai_native" | "local_parse";

export const defaultDocumentMode: DocumentMode = "openai_native";

function normalizeDocumentMode(value: string | null | undefined): DocumentMode {
  return value === "local_parse" ? "local_parse" : defaultDocumentMode;
}

export async function getDocumentMode() {
  const setting = await getDb().appSetting.upsert({
    where: { key: "documentMode" },
    update: {},
    create: {
      key: "documentMode",
      value: defaultDocumentMode,
    },
  });

  return normalizeDocumentMode(setting.value);
}

export async function setDocumentMode(mode: DocumentMode) {
  if (mode !== "openai_native") {
    throw new Error("Local parsing mode is not available yet.");
  }

  const setting = await getDb().appSetting.upsert({
    where: { key: "documentMode" },
    update: { value: mode },
    create: {
      key: "documentMode",
      value: mode,
    },
  });

  return normalizeDocumentMode(setting.value);
}
