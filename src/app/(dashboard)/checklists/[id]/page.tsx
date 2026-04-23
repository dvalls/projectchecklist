import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type {
  ClChecklistSequence,
  ClChecklistStep,
  ClFormTemplate,
} from "@/lib/supabase/types";

import { SequenceEditor } from "@/components/checklist/sequence-editor";

export const dynamic = "force-dynamic";

export default async function ChecklistEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: sequence } = await supabase
    .from("cl_checklist_sequences")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!sequence) notFound();

  const typedSequence = sequence as ClChecklistSequence;

  const [{ data: steps }, { data: templates }, { data: submissions }] =
    await Promise.all([
      supabase
        .from("cl_checklist_steps")
        .select("*")
        .eq("sequence_id", params.id)
        .order("position"),
      supabase
        .from("cl_form_templates")
        .select("*")
        .eq("project_id", typedSequence.project_id)
        .order("name"),
      supabase
        .from("cl_form_submissions")
        .select("template_id, status")
        .eq("sequence_id", params.id)
        .eq("status", "submitted"),
    ]);

  const typedSteps = (steps ?? []) as ClChecklistStep[];
  const typedTemplates = (templates ?? []) as ClFormTemplate[];
  const submittedTemplateIds = (
    (submissions ?? []) as { template_id: string }[]
  ).map((s) => s.template_id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${typedSequence.project_id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o projeto
        </Link>
      </div>

      <SequenceEditor
        sequence={typedSequence}
        initialSteps={typedSteps}
        availableTemplates={typedTemplates}
        submittedTemplateIds={submittedTemplateIds}
      />
    </div>
  );
}
