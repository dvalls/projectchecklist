"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface SubmissionValueInput {
  field_id: string;
  value: string | null;
  image_url: string | null;
}

export interface CreateSubmissionInput {
  template_id: string;
  project_id: string;
  sequence_id?: string | null;
  step_id?: string | null;
  values: SubmissionValueInput[];
  asDraft?: boolean;
}

export async function createSubmission(input: CreateSubmissionInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado." };

  const status = input.asDraft ? "draft" : "submitted";

  const { data: submission, error: subErr } = await supabase
    .from("cl_form_submissions")
    .insert({
      template_id: input.template_id,
      project_id: input.project_id,
      sequence_id: input.sequence_id ?? null,
      step_id: input.step_id ?? null,
      submitted_by: user.id,
      status,
      submitted_at: input.asDraft ? null : new Date().toISOString(),
    })
    .select("id")
    .single();

  if (subErr || !submission) {
    return { error: subErr?.message ?? "Erro ao criar submissão." };
  }

  const typedSubmission = submission as { id: string };

  if (input.values.length > 0) {
    const rows = input.values.map((v) => ({
      submission_id: typedSubmission.id,
      field_id: v.field_id,
      value: v.value,
      image_url: v.image_url,
    }));

    const { error: valErr } = await supabase
      .from("cl_submission_values")
      .insert(rows);

    if (valErr) {
      return { error: valErr.message };
    }
  }

  revalidatePath(`/projects/${input.project_id}`);
  if (input.sequence_id) {
    revalidatePath(`/checklists/${input.sequence_id}`);
  }

  if (input.sequence_id) {
    redirect(`/checklists/${input.sequence_id}`);
  } else {
    redirect(`/projects/${input.project_id}`);
  }
}
