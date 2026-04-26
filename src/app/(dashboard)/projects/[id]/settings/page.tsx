import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { PageHeader } from "@/components/layout/page-header";
import { BUCKETS } from "@/lib/constants";
import { getPublicBucketBaseUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { ClDesigner, ClProjectDesigner } from "@/lib/supabase/types";

import { ProjectBehaviorSettings } from "../project-behavior-settings";
import { ProjectCoverSettings } from "../project-cover-settings";
import { ProjectDesignersPanel } from "../project-designers-panel";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: project } = await supabase
    .from("cl_projects")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!project) notFound();

  const [{ data: allDesigners }, { data: projectDesigners }] = await Promise.all([
    supabase.from("cl_designers").select("*").order("name"),
    supabase
      .from("cl_project_designers")
      .select("*")
      .eq("project_id", params.id)
      .order("position"),
  ]);

  const typedAllDesigners = (allDesigners ?? []) as ClDesigner[];
  const selectedDesignerIds = ((projectDesigners ?? []) as ClProjectDesigner[])
    .sort((a, b) => a.position - b.position)
    .map((d) => d.designer_id);

  const publicBaseUrl = getPublicBucketBaseUrl(BUCKETS.CHECKLIST_IMAGES);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/projects/${project.id}`} className="mb-4">
          Voltar para o projeto
        </BackLink>
        <PageHeader title="Configurações do projeto" description={project.name} />
      </div>

      <ProjectCoverSettings
        projectId={project.id}
        initialImageUrl={project.image_url ?? null}
        publicBaseUrl={publicBaseUrl}
      />

      <ProjectBehaviorSettings
        projectId={project.id}
        initialAllow={Boolean(project.allow_resubmit_answers)}
      />

      <ProjectDesignersPanel
        projectId={project.id}
        allDesigners={typedAllDesigners}
        selectedIds={selectedDesignerIds}
        publicBaseUrl={publicBaseUrl}
      />
    </div>
  );
}
