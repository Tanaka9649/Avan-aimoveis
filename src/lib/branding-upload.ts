export const MAX_BRANDING_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/vnd.microsoft.icon": ".ico",
};

export function brandingExtension(mime: string) {
  return MIME_EXTENSIONS[mime] || null;
}

export function validBrandingAsset(asset: string) {
  return /^[0-9a-f-]{36}\.(?:png|jpg|webp|svg|ico)$/i.test(asset);
}
