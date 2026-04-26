import { BUCKETS } from "@/lib/constants";
import { getPublicAssetUrl } from "@/lib/storage";

export const TEMPLATE_ASSETS_BUCKET = BUCKETS.TEMPLATE_ASSETS;

export function getTemplateAssetPublicUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  return getPublicAssetUrl(TEMPLATE_ASSETS_BUCKET, path);
}
