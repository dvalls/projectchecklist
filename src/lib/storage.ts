import { env } from "@/lib/env";
import type { BucketName } from "@/lib/constants";

export function getPublicAssetUrl(bucket: BucketName, path: string): string {
  const trimmed = path.startsWith("/") ? path.slice(1) : path;
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${trimmed}`;
}

export function getPublicBucketBaseUrl(bucket: BucketName): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}`;
}
