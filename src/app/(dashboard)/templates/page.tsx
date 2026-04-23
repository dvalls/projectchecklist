import Link from "next/link";
import { FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data: templates } = await supabase
    .from("cl_form_templates")
    .select("*, cl_projects(name), cl_disciplines(name, color)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Formulários"
        description="Todos os formulários do sistema."
      />

      {!templates || templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Nenhum formulário"
          description="Crie formulários dentro de um projeto."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const project = (t as unknown as {
              cl_projects: { name: string } | null;
            }).cl_projects;
            const discipline = (t as unknown as {
              cl_disciplines: { name: string; color: string } | null;
            }).cl_disciplines;
            return (
              <Link key={t.id} href={`/templates/${t.id}`} className="block">
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-1 text-base">
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {project?.name ?? "—"}
                    </Badge>
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
                    ) : null}
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
