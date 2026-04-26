import { z } from "zod";

export const designerInputSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório."),
  role: z.string().trim().nullable().optional(),
  formation: z.string().trim().nullable().optional(),
  photo_url: z.string().trim().nullable().optional(),
});

export type DesignerInput = z.infer<typeof designerInputSchema>;
