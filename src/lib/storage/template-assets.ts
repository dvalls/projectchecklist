export const TEMPLATE_ASSETS_BUCKET = "checklist-template-assets";

export function getTemplateAssetPublicUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${TEMPLATE_ASSETS_BUCKET}/${path}`;
}
