import { z } from "zod";

export const submissionValueInputSchema = z.object({
  field_id: z.string().min(1),
  value: z.string().nullable(),
  image_url: z.string().nullable(),
});

export const submissionMatrixValueInputSchema = z.object({
  field_id: z.string().min(1),
  env_key: z.string().min(1),
  value: z.string().nullable(),
  image_url: z.string().nullable(),
});

export const createSubmissionSchema = z.object({
  template_id: z.string().min(1),
  project_id: z.string().min(1),
  values: z.array(submissionValueInputSchema),
  matrix_values: z.array(submissionMatrixValueInputSchema).optional(),
  asDraft: z.boolean().optional(),
});

export type CreateSubmissionParsed = z.infer<typeof createSubmissionSchema>;
