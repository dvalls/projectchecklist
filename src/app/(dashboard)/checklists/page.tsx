import Link from "next/link";
import { ListChecks } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function ChecklistsPage() {
  const supabase = createClient();
  const { data: sequences } = await supabase
    .from("cl_checklist_sequences")
    .select("*, cl_projects(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Checklists"
        description="Sequências orientadas de formulários."
      />

      {!sequences || sequences.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="Nenhum checklist"
          description="Crie sequências dentro de um projeto."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sequences.map((s) => {
            const project = (s as unknown as {
              cl_projects: { name: string } | null;
            }).cl_projects;
            return (
              <Link key={s.id} href={`/checklists/${s.id}`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1 text-base">
                      {s.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {s.description || "Sem descrição"}
                    </p>
                    <Badge variant="secondary">
                      {project?.name ?? "—"}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
