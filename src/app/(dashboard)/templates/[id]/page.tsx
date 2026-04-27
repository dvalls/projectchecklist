import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { createClient } from "@/lib/supabase/server";
import type { ClFormField, ClFormSection, ClFormTemplate } from "@/lib/supabase/types";

import { TemplateBuilder } from "@/components/form-builder/template-builder";

export const dynamic = "force-dynamic";

export default async function TemplateEditorPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: template } = await supabase
    .from("cl_form_templates")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!template) notFound();

  const [{ data: sections }, { data: fields }] = await Promise.all([
    supabase
      .from("cl_form_sections")
      .select("*")
      .eq("template_id", params.id)
      .order("position"),
    supabase
      .from("cl_form_fields")
      .select("*")
      .eq("template_id", params.id)
      .order("position"),
  ]);

  const typedTemplate = template as ClFormTemplate;
  const backHref = typedTemplate.project_id
    ? `/projects/${typedTemplate.project_id}`
    : "/settings/forms";
  const backLabel = typedTemplate.project_id
    ? "Voltar para o projeto"
    : "Voltar para templates";

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={backHref}>{backLabel}</BackLink>
      </div>

      <TemplateBuilder
        template={typedTemplate}
        initialSections={(sections ?? []) as ClFormSection[]}
        initialFields={(fields ?? []) as ClFormField[]}
      />
    </div>
  );
}
