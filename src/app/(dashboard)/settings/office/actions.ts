"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface OfficeSettingsInput {
  office_name: string | null;
  logo_url: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  twitter: string | null;
  whatsapp: string | null;
}

export async function upsertOfficeSettings(input: OfficeSettingsInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase.from("cl_office_settings").upsert(
    {
      user_id: user.id,
      office_name: input.office_name?.trim() || null,
      logo_url: input.logo_url || null,
      website: input.website?.trim() || null,
      instagram: input.instagram?.trim() || null,
      facebook: input.facebook?.trim() || null,
      linkedin: input.linkedin?.trim() || null,
      twitter: input.twitter?.trim() || null,
      whatsapp: input.whatsapp?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/settings/office");
  return { success: true };
}
