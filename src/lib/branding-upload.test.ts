import { describe, expect, it } from "vitest";
import { brandingExtension, MAX_BRANDING_BYTES, validBrandingAsset } from "./branding-upload";

describe("branding uploads", () => {
  it("accepts only supported image MIME types", () => {
    expect(brandingExtension("image/png")).toBe(".png");
    expect(brandingExtension("image/svg+xml")).toBe(".svg");
    expect(brandingExtension("application/pdf")).toBeNull();
  });

  it("keeps the branding file limit explicit", () => {
    expect(MAX_BRANDING_BYTES).toBe(5 * 1024 * 1024);
  });

  it("accepts only stable UUID-named branding assets", () => {
    expect(validBrandingAsset("11111111-1111-4111-8111-111111111111.png")).toBe(true);
    expect(validBrandingAsset("../logo.png")).toBe(false);
    expect(validBrandingAsset("logo.exe")).toBe(false);
  });
});
