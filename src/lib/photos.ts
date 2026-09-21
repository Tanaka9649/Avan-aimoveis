/**
 * Single source of truth for property photo sizes and URLs.
 * Client-safe: the sharp pipeline that produces these lives in ./photo-pipeline.
 */
export const PHOTO_VARIANTS = {
  /** Cards, CRM lists, dashboards and match lists — never the full picture. */
  thumb: { width: 480, quality: 70 },
  /** Property page and gallery on a normal screen. */
  medium: { width: 1280, quality: 78 },
  /** Fullscreen, print and PDF. */
  full: { width: 1920, quality: 82 },
} as const;

export type PhotoVariant = keyof typeof PHOTO_VARIANTS;
export const PHOTO_VARIANT_NAMES = Object.keys(PHOTO_VARIANTS) as PhotoVariant[];
export const isPhotoVariant = (value: string): value is PhotoVariant => PHOTO_VARIANT_NAMES.includes(value as PhotoVariant);

/** Sizes hints matching how each variant is actually laid out, so the browser never over-fetches. */
export const PHOTO_SIZES = {
  card: "(max-width: 620px) 92vw, (max-width: 1100px) 45vw, 340px",
  adminCard: "(max-width: 620px) 92vw, (max-width: 1100px) 45vw, 320px",
  thumbnail: "120px",
  gallery: "(max-width: 900px) 100vw, 760px",
  hero: "100vw",
} as const;

/**
 * URL of one photo at one size. Keys are immutable (a replaced photo gets a new id),
 * so these URLs are safe to cache for a year — see the route handler.
 */
export function photoUrl(photoId: string, variant: PhotoVariant = "full") {
  return variant === "full" ? `/api/property-photos/${photoId}` : `/api/property-photos/${photoId}?v=${variant}`;
}

/** Storage key for a variant, falling back to the original for photos uploaded before the pipeline. */
export function variantKey(photo: { storagePath: string; variants?: Record<string, string> | null }, variant: PhotoVariant) {
  return photo.variants?.[variant] || photo.variants?.full || photo.storagePath;
}

export const PHOTO_PLACEHOLDER = "/property-placeholder.svg";

/** Neutral 4:3 placeholder used while a photo without a stored blur decodes. */
export const NEUTRAL_BLUR = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjYiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjYiIGZpbGw9IiNlOGU2ZTEiLz48L3N2Zz4=";
