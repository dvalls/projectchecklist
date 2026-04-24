import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  FileText,
  Plus,
  Settings,
  User,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type {
  ClDesigner,
  ClDiscipline,
  ClFormTemplate,
  ClProjectDesigner,
  ClPublicLink,
} from "@/lib/supabase/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTemplateDialog } from "./templates/new-template-dialog";
import {
  ImportExistingTemplateDialog,
  type ImportableTemplate,
} from "./templates/import-existing-dialog";
import { ProjectPublicLinkDialog } from "./project-public-link-dialog";

const BUCKET = "checklist-images";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
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

  const [
    { data: disciplines },
    { data: templates },
    { data: otherTemplates },
    { data: links },
    { data: allDesigners },
    { data: projectDesigners },
  ] = await Promise.all([
    supabase.from("cl_disciplines").select("*").order("name"),
    supabase
      .from("cl_form_templates")
      .select("*, cl_disciplines(name, color)")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cl_form_templates")
      .select(
        "id, name, project_id, cl_projects(name), cl_disciplines(name, color)",
      )
      .neq("project_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cl_public_links")
      .select("*")
      .eq("project_id", params.id)
      .is("template_id", null)
      .order("created_at", { ascending: false }),
    supabase.from("cl_designers").select("*").order("name"),
    supabase
      .from("cl_project_designers")
      .select("*")
      .eq("project_id", params.id)
      .order("position"),
  ]);

  const typedTemplates = (templates ?? []) as (ClFormTemplate & {
    cl_disciplines?: { name: string; color: string } | null;
  })[];
  const typedDisciplines = (disciplines ?? []) as ClDiscipline[];

  const byDesignerId = new Map(
    ((allDesigners ?? []) as ClDesigner[]).map((d) => [d.id, d]),
  );
  const orderedDesigners = ((projectDesigners ?? []) as ClProjectDesigner[])
    .sort((a, b) => a.position - b.position)
    .map((pd) => byDesignerId.get(pd.designer_id))
    .filter(Boolean) as ClDesigner[];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/projects"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para projetos
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          {project.description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {project.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ProjectPublicLinkDialog
            projectId={project.id}
            initialLinks={(links ?? []) as ClPublicLink[]}
            templates={typedTemplates}
          />
          <Button asChild size="sm" variant="outline">
            <Link href={`/projects/${project.id}/settings`}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </Link>
          </Button>
        </div>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Formulários</h2>
          </div>
          <div className="flex items-center gap-2">
            <ImportExistingTemplateDialog
              targetProjectId={project.id}
              templates={importableTemplates}
              trigger={
                <Button size="sm" variant="outline">
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar existente
                </Button>
              }
            />
            <NewTemplateDialog
              projectId={project.id}
              disciplines={typedDisciplines}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Novo formulário
                </Button>
              }
            />
          </div>
        </div>

        {templates && templates.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => {
              const discipline = (t as unknown as {
                cl_disciplines: { name: string; color: string } | null;
              }).cl_disciplines;
              return (
                <Link
                  key={t.id}
                  href={`/templates/${t.id}`}
                  className="block"
                >
                  <Card className="h-full transition-colors hover:border-primary/40">
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-1 text-base">
                        {t.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {discipline ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: discipline.color,
                            color: discipline.color,
                          }}
                        >
                          {discipline.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Sem disciplina</Badge>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum formulário criado.
          </p>
        )}
      </section>

      {orderedDesigners.length > 0 ? (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Projetistas</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            {orderedDesigners.map((d) => {
              const photo = d.photo_url
                ? `${publicBaseUrl}/${d.photo_url}`
                : null;
              return (
                <div
                  key={d.id}
                  className="flex w-36 flex-col items-center gap-2 rounded-lg border bg-card p-3 text-center shadow-sm"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border bg-muted">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={d.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <User className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <div className="break-words text-sm font-medium leading-tight">{d.name}</div>
                    {d.role ? (
                      <div className="mt-0.5 break-words text-xs text-muted-foreground">
                        {d.role}
                      </div>
                    ) : null}
                    {d.formation ? (
                      <div className="mt-0.5 break-words text-xs italic text-muted-foreground">
                        {d.formation}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
