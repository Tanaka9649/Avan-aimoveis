import { describe, expect, it } from "vitest";
import { detectMime, validateUploadBytes, validateUploadMetadata } from "./upload";

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);

describe("upload validation", () => {
  it("detects supported signatures instead of trusting the extension", () => {
    expect(detectMime(bytes(0xff, 0xd8, 0xff, 0xdb))).toBe("image/jpeg");
    expect(detectMime(bytes(137, 80, 78, 71, 13, 10, 26, 10))).toBe("image/png");
    expect(detectMime(text("RIFF1234WEBP"))).toBe("image/webp");
    expect(detectMime(text("%PDF-1.7"))).toBe("application/pdf");
  });

  it("detects HEIC and HEIF brands in the ISO base media container", () => {
    expect(detectMime(text("\0\0\0\u0018ftypheic\0\0\0\0mif1"))).toBe("image/heic");
    expect(detectMime(text("\0\0\0\u0018ftypmif1\0\0\0\0msf1"))).toBe("image/heif");
  });

  it("rejects a renamed executable even when MIME and extension claim JPEG", () => {
    const file = { name: "foto.jpg", type: "image/jpeg", size: 1024 };
    expect(validateUploadMetadata(file, "photo")).toBeNull();
    expect(validateUploadBytes(file, text("MZ executable"), "photo")).toContain("conteúdo");
  });

  it("enforces matching safe document extensions", () => {
    expect(validateUploadMetadata({ name: "contrato.exe", type: "application/pdf", size: 100 }, "document")).toContain("documento");
  });
});
