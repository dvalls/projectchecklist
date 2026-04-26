import { BUCKETS } from "@/lib/constants";
import { getPublicBucketBaseUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ClOfficeSettings } from "@/lib/supabase/types";

import { OfficeSettingsManager } from "./office-settings-manager";

export const dynamic = "force-dynamic";

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

  const publicBaseUrl = getPublicBucketBaseUrl(BUCKETS.CHECKLIST_IMAGES);

  return (
    <OfficeSettingsManager
      initialSettings={(settings ?? null) as ClOfficeSettings | null}
      publicBaseUrl={publicBaseUrl}
    />
  );
}
