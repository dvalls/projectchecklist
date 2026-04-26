import { z } from "zod";

export const officeSettingsFormSchema = z.object({
  office_name: z.string().max(120).optional().nullable(),
  website: z.string().url("URL inválida").optional().or(z.literal("")).nullable(),
  instagram: z.string().max(100).optional().nullable(),
  facebook: z.string().max(100).optional().nullable(),
  linkedin: z.string().max(200).optional().nullable(),
  twitter: z.string().max(100).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
});

export type OfficeSettingsFormValues = z.infer<typeof officeSettingsFormSchema>;

export const officeSettingsServerSchema = z.object({
  office_name: z.string().trim().nullable().optional(),
  logo_url: z.string().trim().nullable().optional(),
  website: z.string().trim().nullable().optional(),
  instagram: z.string().trim().nullable().optional(),
  facebook: z.string().trim().nullable().optional(),
  linkedin: z.string().trim().nullable().optional(),
  twitter: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
});

export type OfficeSettingsServerInput = z.infer<typeof officeSettingsServerSchema>;
