import { notFound } from "next/navigation";

import { BackLink } from "@/components/layout/back-link";
import { createClient } from "@/lib/supabase/server";
import type { ClFormField, ClFormSection, ClFormTemplate } from "@/lib/supabase/types";

import { SubmissionForm } from "@/components/submission/submission-form";

export const dynamic = "force-dynamic";

interface SearchParams {
  template?: string;
}

export default async function NewSubmissionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const templateId = searchParams.template;
  if (!templateId) notFound();

  const supabase = createClient();

  const { data: template } = await supabase
    .from("cl_form_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (!template) notFound();

  const [{ data: sections }, { data: fields }] = await Promise.all([
    supabase
      .from("cl_form_sections")
      .select("*")
      .eq("template_id", templateId)
      .order("position"),
    supabase
      .from("cl_form_fields")
      .select("*")
      .eq("template_id", templateId)
      .order("position"),
  ]);

  const typedTemplate = template as ClFormTemplate;
  const typedSections = (sections ?? []) as ClFormSection[];
  const typedFields = (fields ?? []) as ClFormField[];

  const backHref = `/projects/${typedTemplate.project_id}`;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <BackLink href={backHref}>Voltar</BackLink>
      </div>

      <SubmissionForm
        template={typedTemplate}
        sections={typedSections}
        fields={typedFields}
      />
    </div>
  );
}
