import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;

export const PHOTO_BUCKET = process.env.NEON_STORAGE_PHOTOS_BUCKET || "property-photos";
export const DOCUMENT_BUCKET = process.env.NEON_STORAGE_DOCUMENTS_BUCKET || "property-documents";

export function storageClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Neon Object Storage não configurado");
  }
  client ??= new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}
