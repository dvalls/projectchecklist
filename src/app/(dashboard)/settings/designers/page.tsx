import { createClient } from "@/lib/supabase/server";
import type { ClDesigner } from "@/lib/supabase/types";

import { DesignersManager } from "./designers-manager";

export const dynamic = "force-dynamic";

const BUCKET = "checklist-images";

export default async function SettingsDesignersPage() {
  const supabase = createClient();

  const { data: designers } = await supabase
    .from("cl_designers")
    .select("*")
    .order("created_at", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

  return (
    <DesignersManager
      initialDesigners={(designers ?? []) as ClDesigner[]}
      publicBaseUrl={publicBaseUrl}
    />
  );
}
