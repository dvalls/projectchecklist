import { BUCKETS } from "@/lib/constants";
import { getPublicBucketBaseUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ClDesigner } from "@/lib/supabase/types";

import { DesignersManager } from "./designers-manager";

export const dynamic = "force-dynamic";

export default async function SettingsDesignersPage() {
  const supabase = createClient();

  const { data: designers } = await supabase
    .from("cl_designers")
    .select("*")
    .order("created_at", { ascending: false });

  const publicBaseUrl = getPublicBucketBaseUrl(BUCKETS.CHECKLIST_IMAGES);

  return (
    <DesignersManager
      initialDesigners={(designers ?? []) as ClDesigner[]}
      publicBaseUrl={publicBaseUrl}
    />
  );
}
