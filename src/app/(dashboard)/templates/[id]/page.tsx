import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { ClFormField } from "@/lib/supabase/types";

import { TemplateBuilder } from "@/components/form-builder/template-builder";

export const dynamic = "force-dynamic";

export default async function TemplateEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: template } = await supabase
    .from("cl_form_templates")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!template) notFound();

  const { data: fields } = await supabase
    .from("cl_form_fields")
    .select("*")
    .eq("template_id", params.id)
    .order("position");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${template.project_id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o projeto
        </Link>
      </div>

      <TemplateBuilder
        template={template}
        initialFields={(fields ?? []) as ClFormField[]}
      />
    </div>
  );
}
