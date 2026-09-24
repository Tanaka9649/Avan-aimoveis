export const MAX_PROPERTY_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
export const DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const extensions: Record<string, Set<string>> = {
  "image/jpeg": new Set(["jpg", "jpeg"]),
  "image/png": new Set(["png"]),
  "image/webp": new Set(["webp"]),
  "image/heic": new Set(["heic"]),
  "image/heif": new Set(["heif"]),
  "application/pdf": new Set(["pdf"]),
};

export type UploadKind = "photo" | "document";
export type UploadMetadata = { name: string; type: string; size: number };

export function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "arquivo";
}

function extension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
}

export function validateUploadMetadata(file: UploadMetadata, kind: UploadKind) {
  const types = kind === "photo" ? PHOTO_TYPES : DOCUMENT_TYPES;
  const limit = kind === "photo" ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES;
  if (!types.has(file.type) || !extensions[file.type]?.has(extension(file.name))) {
    return kind === "photo"
      ? "Use uma imagem JPG, JPEG, PNG, WebP, HEIF ou HEIC válida."
      : "Envie um documento PDF, JPG, JPEG, PNG ou WebP válido.";
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0 || file.size > limit) return `O arquivo deve ter no máximo ${limit / 1024 / 1024} MB.`;
  return null;
}

export function detectMime(header: Uint8Array) {
  if (header.length >= 4 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) return "image/jpeg";
  if (header.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)) return "image/png";
  if (header.length >= 12 && ascii(header, 0, 4) === "RIFF" && ascii(header, 8, 12) === "WEBP") return "image/webp";
  if (header.length >= 5 && ascii(header, 0, 5) === "%PDF-") return "application/pdf";
  if (header.length >= 16 && ascii(header, 4, 8) === "ftyp") {
    const brands = ascii(header, 8, Math.min(header.length, 64));
    if (/(heic|heix|hevc|hevx|heim|heis)/.test(brands)) return "image/heic";
    if (/(mif1|msf1)/.test(brands)) return "image/heif";
  }
  return null;
}

function ascii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function validateUploadBytes(file: UploadMetadata, header: Uint8Array, kind: UploadKind) {
  const metadataError = validateUploadMetadata(file, kind);
  if (metadataError) return metadataError;
  const detected = detectMime(header);
  const mimeMatches = detected === file.type || (detected === "image/heic" && file.type === "image/heif");
  if (!detected || !mimeMatches) return "O conteúdo do arquivo não corresponde ao formato informado.";
  return null;
}

/** Compatibility helper for small uploads that still pass through the application server. */
export function validateUpload(file: File, kind: UploadKind) {
  return validateUploadMetadata(file, kind);
}
