import { createClient } from "@/lib/supabase/server";
import type { ClDiscipline } from "@/lib/supabase/types";

import { DisciplinesManager } from "./disciplines-manager";

export const dynamic = "force-dynamic";

export default async function SettingsDisciplinesPage() {
  const supabase = createClient();
  const { data: disciplines } = await supabase
    .from("cl_disciplines")
    .select("*")
    .order("name");

  return (
    <DisciplinesManager
      initialDisciplines={(disciplines ?? []) as ClDiscipline[]}
    />
  );
}
