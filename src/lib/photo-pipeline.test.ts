import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

vi.mock("server-only", () => ({}));

import { processPropertyPhoto } from "./photo-pipeline";
import { PHOTO_VARIANTS } from "./photos";

async function photo(width: number, height: number) {
  // Noisy image so the encoder cannot cheat with a flat colour — closer to a real listing photo.
  const noise = await sharp({ create: { width, height, channels: 3, background: "#8899aa", noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg({ quality: 92 }).toBuffer();
  return noise;
}

describe("processPropertyPhoto", () => {
  it("produces thumb, medium and full, each no wider than its budget", async () => {
    const result = await processPropertyPhoto(await photo(3000, 2000));
    const byName = Object.fromEntries(result.variants.map((variant) => [variant.name, variant]));
    expect(Object.keys(byName).sort()).toEqual(["full", "medium", "thumb"]);
    expect(byName.thumb.width).toBe(PHOTO_VARIANTS.thumb.width);
    expect(byName.medium.width).toBe(PHOTO_VARIANTS.medium.width);
    expect(byName.full.width).toBe(PHOTO_VARIANTS.full.width);
  }, 30000);

  it("makes the card thumbnail a small fraction of the full picture", async () => {
    const result = await processPropertyPhoto(await photo(3000, 2000));
    const thumb = result.variants.find((variant) => variant.name === "thumb")!;
    const full = result.variants.find((variant) => variant.name === "full")!;
    expect(thumb.body.byteLength).toBeLessThan(full.body.byteLength / 4);
  }, 30000);

  it("never enlarges a small photo", async () => {
    const result = await processPropertyPhoto(await photo(320, 240));
    for (const variant of result.variants) expect(variant.width).toBeLessThanOrEqual(320);
  }, 30000);

  it("returns an inline blur placeholder small enough to ship in the HTML", async () => {
    const result = await processPropertyPhoto(await photo(1600, 1200));
    expect(result.blurData.startsWith("data:image/webp;base64,")).toBe(true);
    expect(result.blurData.length).toBeLessThan(2000);
    expect(result.width).toBe(1600);
  }, 30000);

  it("drops EXIF orientation and metadata, delivering an upright WebP", async () => {
    const rotated = await sharp({ create: { width: 1200, height: 600, channels: 3, background: "#336699" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const result = await processPropertyPhoto(rotated);
    const full = result.variants.find((variant) => variant.name === "full")!;
    const meta = await sharp(full.body).metadata();
    expect(meta.format).toBe("webp");
    // Orientation 6 means "rotate 90°", so the stored picture must come out portrait.
    expect(full.height).toBeGreaterThan(full.width);
    expect(meta.exif).toBeUndefined();
  }, 30000);
});
