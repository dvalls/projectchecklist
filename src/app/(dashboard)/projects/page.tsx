import Image from "next/image";
import Link from "next/link";
import { FolderKanban, ImageIcon, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

import type {
  ClFormSubmission,
  ClFormTemplate,
} from "@/lib/supabase/types";

import { NewProjectDialog } from "./new-project-dialog";
import { ProjectPublicSubmissionsDialog } from "./project-public-submissions-dialog";

export const dynamic = "force-dynamic";

const BUCKET = "checklist-images";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const storageBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("cl_projects")
    .select("*")
    .order("created_at", { ascending: false });

  const projectIds = (projects ?? []).map((p) => p.id);

  const [{ data: publicSubmissions }, { data: templates }] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from("cl_form_submissions")
          .select("*")
          .in("project_id", projectIds)
          .not("public_link_id", "is", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as ClFormSubmission[] }),
    projectIds.length > 0
      ? supabase
          .from("cl_form_templates")
          .select("*")
          .in("project_id", projectIds)
      : Promise.resolve({ data: [] as ClFormTemplate[] }),
  ]);

  const submissionsByProject = new Map<string, ClFormSubmission[]>();
  for (const s of (publicSubmissions ?? []) as ClFormSubmission[]) {
    const list = submissionsByProject.get(s.project_id) ?? [];
    list.push(s);
    submissionsByProject.set(s.project_id, list);
  }

  const templatesByProject = new Map<string, ClFormTemplate[]>();
  for (const t of (templates ?? []) as ClFormTemplate[]) {
    const list = templatesByProject.get(t.project_id) ?? [];
    list.push(t);
    templatesByProject.set(t.project_id, list);
  }

  return (
    <div>
      <PageHeader
        title="Projetos"
        description="Organize checklists e formulários por projeto."
        actions={
          <NewProjectDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo projeto
              </Button>
            }
          />
        }
      />

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="Nenhum projeto ainda"
          description="Crie seu primeiro projeto para começar a organizar checklists e formulários."
          action={
            <NewProjectDialog
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeiro projeto
                </Button>
              }
            />
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const projectSubmissions =
              submissionsByProject.get(project.id) ?? [];
            const projectTemplates = templatesByProject.get(project.id) ?? [];
            return (
              <Card
                key={project.id}
                className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/40"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="flex flex-1 flex-col"
                >
                  <div className="relative h-28 w-full shrink-0 overflow-hidden bg-gradient-to-br from-primary/10 to-muted">
                    {project.image_url ? (
                      <Image
                        src={`${storageBaseUrl}/${project.image_url}`}
                        alt={project.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 px-4 py-3">
                    <p className="line-clamp-1 font-semibold leading-tight">
                      {project.name}
                    </p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {project.description || "Sem descrição"}
                    </p>
                    <p className="mt-auto pt-2 text-xs text-muted-foreground/70">
                      Criado em{" "}
                      {new Date(project.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </Link>
                <div className="border-t px-6 py-3">
                  <ProjectPublicSubmissionsDialog
                    projectName={project.name}
                    submissions={projectSubmissions}
                    templates={projectTemplates}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
