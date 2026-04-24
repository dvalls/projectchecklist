"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface SubmissionValueInput {
  field_id: string;
  value: string | null;
  image_url: string | null;
}

export interface SubmissionMatrixValueInput {
  field_id: string;
  env_key: string;
  value: string | null;
  image_url: string | null;
}

export interface CreateSubmissionInput {
  template_id: string;
  project_id: string;
  values: SubmissionValueInput[];
  matrix_values?: SubmissionMatrixValueInput[];
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

  if (input.matrix_values && input.matrix_values.length > 0) {
    const rows = input.matrix_values.map((v) => ({
      submission_id: typedSubmission.id,
      field_id: v.field_id,
      env_key: v.env_key,
      value: v.value,
      image_url: v.image_url,
    }));

    const { error: matErr } = await supabase
      .from("cl_submission_values_matrix")
      .insert(rows);

    if (matErr) {
      return { error: matErr.message };
    }
  }

  revalidatePath(`/projects/${input.project_id}`);
  redirect(`/projects/${input.project_id}`);
}
