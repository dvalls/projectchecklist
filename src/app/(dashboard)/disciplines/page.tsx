import { LayoutGrid } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function DisciplinesPage() {
  const supabase = createClient();
  const { data: disciplines } = await supabase
    .from("cl_disciplines")
    .select("*, cl_projects(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Disciplinas"
        description="Visão geral de todas as disciplinas dos seus projetos."
      />

      {!disciplines || disciplines.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-6 w-6" />}
          title="Nenhuma disciplina"
          description="Crie disciplinas dentro de um projeto para agrupar seus formulários."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {disciplines.map((d) => {
            const project = (d as unknown as {
              cl_projects: { name: string } | null;
            }).cl_projects;
            return (
              <Card key={d.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    {project?.name ?? "Projeto removido"}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
