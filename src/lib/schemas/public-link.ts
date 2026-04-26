import { z } from "zod";

export const identityIdentificationSchema = z.object({
  client_name: z.string().trim().min(1, "Informe o seu nome."),
  client_email: z.string().trim().toLowerCase().email("E-mail inválido."),
});

export type IdentityIdentificationInput = z.infer<typeof identityIdentificationSchema>;
