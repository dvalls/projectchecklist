import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { ClFormField, ClFormTemplate } from "@/lib/supabase/types";

import { SubmissionForm } from "@/components/submission/submission-form";

export const dynamic = "force-dynamic";

interface SearchParams {
  template?: string;
  sequence?: string;
  step?: string;
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

  const { data: fields } = await supabase
    .from("cl_form_fields")
    .select("*")
    .eq("template_id", templateId)
    .order("position");

  const typedTemplate = template as ClFormTemplate;
  const typedFields = (fields ?? []) as ClFormField[];

  const backHref = searchParams.sequence
    ? `/checklists/${searchParams.sequence}`
    : `/projects/${typedTemplate.project_id}`;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </div>

      <SubmissionForm
        template={typedTemplate}
        fields={typedFields}
        sequenceId={searchParams.sequence}
        stepId={searchParams.step}
      />
    </div>
  );
}
