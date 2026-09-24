import "server-only";
import sharp from "sharp";
import decodeHeic from "heic-decode";
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
export async function processPropertyPhoto(input: Buffer, only?: PhotoVariant[], mime?: string | null): Promise<ProcessedPhoto> {
  const source = mime === "image/heic" || mime === "image/heif"
    ? await heicSource(input)
    : { data: input, options: { failOn: "error" as const } };
  const base = sharp(source.data, source.options).rotate();
  const selected = (Object.entries(PHOTO_VARIANTS) as [PhotoVariant, (typeof PHOTO_VARIANTS)[PhotoVariant]][])
    .filter(([name]) => !only || only.includes(name));
  const [variants, blur] = await Promise.all([
    Promise.all(selected.map(async ([name, config]) => {
      const { data, info } = await base.clone()
        .resize({ width: config.width, height: config.width, fit: "inside", withoutEnlargement: true })
        .webp({ quality: config.quality, effort: 3 })
        .toBuffer({ resolveWithObject: true });
      return { name, body: data, width: info.width, height: info.height };
    })),
    base.clone().resize({ width: 16 }).webp({ quality: 35, effort: 1 }).toBuffer(),
  ]);
  const largest = variants.find((variant) => variant.name === "full") || variants[variants.length - 1];
  return { variants, blurData: `data:image/webp;base64,${blur.toString("base64")}`, width: largest.width, height: largest.height };
}

async function heicSource(input: Buffer) {
  const decoded = await decodeHeic({ buffer: input });
  if (!decoded.width || !decoded.height || decoded.data.length !== decoded.width * decoded.height * 4) throw new Error("HEIF inválido");
  return {
    data: Buffer.from(decoded.data.buffer, decoded.data.byteOffset, decoded.data.byteLength),
    options: { raw: { width: decoded.width, height: decoded.height, channels: 4 as const }, failOn: "error" as const },
  };
}
