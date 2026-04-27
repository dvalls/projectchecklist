import { FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { TemplateCard } from "@/components/templates/template-card";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = createClient();
  const { data: templates } = await supabase
    .from("cl_form_templates")
    .select("*, cl_disciplines(name, color)")
    .eq("is_template", true)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Formulários"
        description="Biblioteca de templates reutilizáveis em qualquer projeto."
      />

      {!templates || templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="Nenhum template"
          description='Dentro de um formulário, use o menu "Mais opções" → "Salvar como template" para reaproveitá-lo em outros projetos.'
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const discipline = (
              t as unknown as {
                cl_disciplines: { name: string; color: string } | null;
              }
            ).cl_disciplines;
            return (
              <TemplateCard
                key={t.id}
                id={t.id}
                name={t.name}
                projectId={null}
                projectName={null}
                discipline={discipline ?? null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
