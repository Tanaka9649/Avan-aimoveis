/** Trusted deployment configuration, never a caller-controlled Host header. */
export function platformBaseUrl() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return (process.env.PLATFORM_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}
