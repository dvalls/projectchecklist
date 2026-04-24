import { createClient } from "@/lib/supabase/server";
import type { ClOfficeSettings } from "@/lib/supabase/types";

import { OfficeSettingsManager } from "./office-settings-manager";

export const dynamic = "force-dynamic";

const BUCKET = "checklist-images";

export default async function SettingsOfficePage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = user
    ? await supabase
        .from("cl_office_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

  return (
    <OfficeSettingsManager
      initialSettings={(settings ?? null) as ClOfficeSettings | null}
      publicBaseUrl={publicBaseUrl}
    />
  );
}
