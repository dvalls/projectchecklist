export const BUCKETS = {
  CHECKLIST_IMAGES: "checklist-images",
  TEMPLATE_ASSETS: "checklist-template-assets",
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

export const OFFICE_PUBLIC_FIELDS =
  "office_name, logo_url, website, instagram, facebook, linkedin, twitter, whatsapp" as const;

export const AUTH_ERROR_MESSAGE = "Usuário não autenticado." as const;
