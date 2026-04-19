function asciiFilenameFallback(filename: string) {
  const fallback = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/[\\"]/g, "_")
    .trim();

  return fallback || "download";
}

function encodeRfc5987Value(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function contentDispositionAttachment(filename: string) {
  const fallback = asciiFilenameFallback(filename);
  const encoded = encodeRfc5987Value(filename);

  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

