import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { BUCKETS } from "@/lib/constants";
import { getPublicBucketBaseUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ClDesigner, ClDiscipline } from "@/lib/supabase/types";

import { ProjectWizard } from "./project-wizard";

import type { ImportableTemplate } from "../[id]/templates/import-existing-dialog";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const supabase = createClient();

  const [{ data: disciplines }, { data: designers }, { data: otherTemplates }] =
    await Promise.all([
      supabase.from("cl_disciplines").select("*").order("name"),
      supabase.from("cl_designers").select("*").order("name"),
      supabase
        .from("cl_form_templates")
        .select("id, name, project_id, cl_projects(name), cl_disciplines(name, color)")
        .order("created_at", { ascending: false }),
    ]);

  const publicBaseUrl = getPublicBucketBaseUrl(BUCKETS.CHECKLIST_IMAGES);

  const importableTemplates: ImportableTemplate[] = (
    (otherTemplates ?? []) as unknown as {
      id: string;
      name: string;
      project_id: string;
      cl_projects: { name: string } | null;
      cl_disciplines: { name: string; color: string } | null;
    }[]
  )
    .filter((t) => t.cl_projects)
    .map((t) => ({
      id: t.id,
      name: t.name,
      project_id: t.project_id,
      project_name: t.cl_projects?.name ?? "Projeto",
      discipline_name: t.cl_disciplines?.name ?? null,
      discipline_color: t.cl_disciplines?.color ?? null,
    }));

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/projects" className="mb-4">
          Voltar para projetos
        </BackLink>
        <PageHeader
          title="Novo projeto"
          description="Configure seu projeto em alguns passos. Tudo pode ser ajustado depois."
        />
      </div>

      <ProjectWizard
        disciplines={(disciplines ?? []) as ClDiscipline[]}
        designers={(designers ?? []) as ClDesigner[]}
        importableTemplates={importableTemplates}
        publicBaseUrl={publicBaseUrl}
      />
    </div>
  );
}
