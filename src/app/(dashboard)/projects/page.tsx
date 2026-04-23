import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

import { NewProjectDialog } from "./new-project-dialog";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = createClient();
  const { data: projects } = await supabase
    .from("cl_projects")
    .select("*")
    .order("created_at", { ascending: false });

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
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block"
            >
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                    {project.description || "Sem descrição"}
                  </p>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Criado em{" "}
                    {new Date(project.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
