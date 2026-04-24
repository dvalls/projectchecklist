import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { ClDesigner, ClProjectDesigner } from "@/lib/supabase/types";

import { ProjectCoverSettings } from "../project-cover-settings";
import { ProjectDesignersPanel } from "../project-designers-panel";

const BUCKET = "checklist-images";

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

  const [{ data: allDesigners }, { data: projectDesigners }] =
    await Promise.all([
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${project.id}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o projeto
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          Configurações do projeto
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {project.name}
        </p>
      </div>

      <ProjectCoverSettings
        projectId={project.id}
        initialImageUrl={project.image_url ?? null}
        publicBaseUrl={publicBaseUrl}
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
