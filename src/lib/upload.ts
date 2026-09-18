export const MAX_PROPERTY_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
export const DOCUMENT_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

export function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "arquivo";
}

export function validateUpload(file: File, kind: "photo" | "document") {
  const types = kind === "photo" ? PHOTO_TYPES : DOCUMENT_TYPES;
  const limit = kind === "photo" ? MAX_PHOTO_BYTES : MAX_DOCUMENT_BYTES;
  if (!types.has(file.type)) return kind === "photo" ? "Use uma imagem JPG, PNG, WebP ou HEIC." : "Envie um documento PDF, JPG, PNG ou WebP.";
  if (file.size <= 0 || file.size > limit) return `O arquivo deve ter no máximo ${limit / 1024 / 1024} MB.`;
  return null;
}
