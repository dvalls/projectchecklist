import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  LayoutGrid,
  ListChecks,
  Plus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { NewDisciplineDialog } from "./disciplines/new-discipline-dialog";
import { NewTemplateDialog } from "./templates/new-template-dialog";
import { NewSequenceDialog } from "./checklists/new-sequence-dialog";

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
    { data: sequences },
  ] = await Promise.all([
    supabase
      .from("cl_disciplines")
      .select("*")
      .eq("project_id", params.id)
      .order("position"),
    supabase
      .from("cl_form_templates")
      .select("*, cl_disciplines(name, color)")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cl_checklist_sequences")
      .select("*")
      .eq("project_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-8">
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

      <Separator />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Disciplinas</h2>
          </div>
          <NewDisciplineDialog
            projectId={project.id}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Nova disciplina
              </Button>
            }
          />
        </div>

        {disciplines && disciplines.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {disciplines.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                {d.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma disciplina criada.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Formulários</h2>
          </div>
          <NewTemplateDialog
            projectId={project.id}
            disciplines={disciplines ?? []}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo formulário
              </Button>
            }
          />
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

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Checklists</h2>
          </div>
          <NewSequenceDialog
            projectId={project.id}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Novo checklist
              </Button>
            }
          />
        </div>

        {sequences && sequences.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sequences.map((s) => (
              <Link
                key={s.id}
                href={`/checklists/${s.id}`}
                className="block"
              >
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1 text-base">
                      {s.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {s.description || "Sem descrição"}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum checklist criado.
          </p>
        )}
      </section>
    </div>
  );
}
