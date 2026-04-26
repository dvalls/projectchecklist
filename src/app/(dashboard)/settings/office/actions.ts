"use server";

import { revalidatePath } from "next/cache";

import {
  officeSettingsServerSchema,
  type OfficeSettingsServerInput,
} from "@/lib/schemas/office";
import { assertUser, fail, ok } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";

export type OfficeSettingsInput = OfficeSettingsServerInput;

export async function upsertOfficeSettings(input: OfficeSettingsInput) {
  const parsed = officeSettingsServerSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const data = parsed.data;
  const { error } = await supabase.from("cl_office_settings").upsert(
    {
      user_id: auth.user.id,
      office_name: data.office_name?.trim() || null,
      logo_url: data.logo_url || null,
      website: data.website?.trim() || null,
      instagram: data.instagram?.trim() || null,
      facebook: data.facebook?.trim() || null,
      linkedin: data.linkedin?.trim() || null,
      twitter: data.twitter?.trim() || null,
      whatsapp: data.whatsapp?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return fail(error.message);

  revalidatePath("/settings/office");
  return ok();
}
