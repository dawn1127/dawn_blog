export type UploadKind = "spreadsheet" | "document" | "image";

export const spreadsheetExtensions = [".csv", ".tsv", ".xls", ".xlsx"];
export const documentExtensions = [
  ".pdf",
  ".doc",
  ".docx",
  ".rtf",
  ".odt",
  ".ppt",
  ".pptx",
  ".txt",
  ".md",
  ".markdown",
  ".json",
  ".html",
  ".htm",
  ".xml",
  ".log",
  ".conf",
  ".cfg",
  ".ini",
  ".yaml",
  ".yml",
];
export const imageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

export const documentAccept = [...spreadsheetExtensions, ...documentExtensions].join(",");
export const imageAccept = [...imageExtensions, "image/*"].join(",");

export function fileExtension(name: string) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

export function getUploadKind(filename: string, mimeType = ""): UploadKind | null {
  const extension = fileExtension(filename);

  if (imageExtensions.includes(extension) || mimeType.startsWith("image/")) {
    return "image";
  }

  if (spreadsheetExtensions.includes(extension)) {
    return "spreadsheet";
  }

  if (documentExtensions.includes(extension)) {
    return "document";
  }

  return null;
}

export function isNativeFileKind(kind: UploadKind) {
  return kind === "spreadsheet" || kind === "document";
}

export function mimeTypeForUpload(filename: string, fallback = "application/octet-stream") {
  const extension = fileExtension(filename);
  const map: Record<string, string> = {
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".rtf": "application/rtf",
    ".odt": "application/vnd.oasis.opendocument.text",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".json": "application/json",
    ".html": "text/html",
    ".htm": "text/html",
    ".xml": "application/xml",
    ".log": "text/plain",
    ".conf": "text/plain",
    ".cfg": "text/plain",
    ".ini": "text/plain",
    ".yaml": "application/yaml",
    ".yml": "application/yaml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };

  return fallback && fallback !== "application/octet-stream" ? fallback : (map[extension] ?? fallback);
}
