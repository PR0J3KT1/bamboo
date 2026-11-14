import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/* Where photos go: a Cloudflare R2 bucket (S3-compatible) with a public URL.
     R2_ACCOUNT_ID        the Cloudflare account id (or R2_ENDPOINT for any S3-compatible store)
     R2_ACCESS_KEY_ID     an R2 API token's access key, with write access to the bucket
     R2_SECRET_ACCESS_KEY its secret
     R2_BUCKET            the bucket name
     R2_PUBLIC_URL        the bucket's public address: its r2.dev URL or a custom domain
   In development without R2, photos are saved in public/uploads instead. In production without
   R2, uploading a photo is refused with a clear message. */

const env = process.env;

export function storageMode(): "r2" | "local" | "none" {
  if (env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET && env.R2_PUBLIC_URL && (env.R2_ACCOUNT_ID || env.R2_ENDPOINT)) return "r2";
  return env.NODE_ENV === "production" ? "none" : "local";
}

let client: S3Client | undefined;
function r2() {
  client ??= new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT || `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID!, secretAccessKey: env.R2_SECRET_ACCESS_KEY! },
    forcePathStyle: !!env.R2_ENDPOINT,
  });
  return client;
}

export class StorageNotConfigured extends Error {
  constructor() {
    super("Photo storage isn't set up yet (the R2_… settings).");
  }
}

/** Save a file and return its public URL. Keys are unique per upload, so a file is never
    overwritten and can be cached for a year. */
export async function putPublic(key: string, body: Buffer, contentType: string): Promise<string> {
  const mode = storageMode();
  if (mode === "none") throw new StorageNotConfigured();
  if (mode === "local") {
    const file = path.join(process.cwd(), "public", "uploads", key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/uploads/${key}`;
  }
  await r2().send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
}
