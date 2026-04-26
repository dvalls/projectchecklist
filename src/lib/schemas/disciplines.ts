import { z } from "zod";

export const disciplineInputSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório."),
  color: z.string().trim().min(1, "Cor é obrigatória.").default("#3b82f6"),
  icon: z.string().trim().nullable().optional(),
});

export type DisciplineInput = z.infer<typeof disciplineInputSchema>;
