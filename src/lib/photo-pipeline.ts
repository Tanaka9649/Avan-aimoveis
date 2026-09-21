import "server-only";
import sharp from "sharp";
import { PHOTO_VARIANTS, type PhotoVariant } from "./photos";

export type ProcessedPhoto = {
  variants: { name: PhotoVariant; body: Buffer; width: number; height: number }[];
  blurData: string;
  width: number;
  height: number;
};

/**
 * Turns one uploaded file into the three sizes the app serves.
 *
 * `rotate()` applies the EXIF orientation and, together with the WebP encoder, drops every other
 * metadata block (GPS, camera, thumbnails), so nothing private travels with a public photo.
 * The stored width/height describe the largest variant produced here.
 * Pass `only` to generate a subset — used when backfilling photos whose original file is already
 * the full-size variant and must not be re-encoded.
 */
export async function processPropertyPhoto(input: Buffer, only?: PhotoVariant[]): Promise<ProcessedPhoto> {
  const upright = await sharp(input, { failOn: "error" }).rotate().toBuffer();

  const variants: ProcessedPhoto["variants"] = [];
  for (const [name, config] of Object.entries(PHOTO_VARIANTS) as [PhotoVariant, (typeof PHOTO_VARIANTS)[PhotoVariant]][]) {
    if (only && !only.includes(name)) continue;
    const { data, info } = await sharp(upright)
      .resize({ width: config.width, height: config.width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: config.quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    variants.push({ name, body: data, width: info.width, height: info.height });
  }

  // Tiny inline preview so the card paints something immediately instead of a grey hole.
  const blur = await sharp(upright).resize({ width: 16 }).webp({ quality: 35, effort: 2 }).toBuffer();
  const largest = variants.find((variant) => variant.name === "full") || variants[variants.length - 1];


  return { variants, blurData: `data:image/webp;base64,${blur.toString("base64")}`, width: largest.width, height: largest.height };
}
