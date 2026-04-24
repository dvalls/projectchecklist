"use server";

import { revalidatePath } from "next/cache";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClFormField,
  ClFormSection,
  ClFormSubmission,
  ClFormTemplate,
  ClSubmissionValue,
  ClSubmissionValueMatrix,
} from "@/lib/supabase/types";

export interface PublicSubmissionValueInput {
  field_id: string;
  value: string | null;
  image_url: string | null;
}

export interface PublicSubmissionMatrixValueInput {
  field_id: string;
  env_key: string;
  value: string | null;
  image_url: string | null;
}

export interface CreatePublicSubmissionInput {
  token: string;
  template_id?: string;
  client_name: string;
  client_email: string;
  values: PublicSubmissionValueInput[];
  matrix_values?: PublicSubmissionMatrixValueInput[];
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createPublicSubmission(
  input: CreatePublicSubmissionInput,
) {
  const name = input.client_name?.trim() ?? "";
  const email = input.client_email?.trim().toLowerCase() ?? "";

  if (!name) return { error: "Informe o seu nome." };
  if (!isValidEmail(email)) return { error: "E-mail inválido." };

  const supabase = createServiceRoleClient();

  const { data: link, error: linkErr } = await supabase
    .from("cl_public_links")
    .select("id, template_id, project_id, is_active")
    .eq("token", input.token)
    .maybeSingle();

  if (linkErr) return { error: linkErr.message };
  if (!link) return { error: "Link inválido." };

  const typedLink = link as {
    id: string;
    template_id: string | null;
    project_id: string;
    is_active: boolean;
  };

  if (!typedLink.is_active) return { error: "Link desativado." };

  const templateId = input.template_id ?? typedLink.template_id;
  if (!templateId) {
    return { error: "Formulário não especificado." };
  }

  if (typedLink.template_id && typedLink.template_id !== templateId) {
    return { error: "Formulário não pertence a este link." };
  }

  if (!typedLink.template_id) {
    const { data: tpl } = await supabase
      .from("cl_form_templates")
      .select("id, project_id, is_public")
      .eq("id", templateId)
      .maybeSingle();
    const typedTpl = tpl as
      | { id: string; project_id: string; is_public: boolean }
      | null;
    if (!typedTpl) return { error: "Formulário inválido." };
    if (typedTpl.project_id !== typedLink.project_id) {
      return { error: "Formulário não pertence a este projeto." };
    }
    if (!typedTpl.is_public) {
      return { error: "Este formulário não está disponível no link público." };
    }
  }

  const { data: submission, error: subErr } = await supabase
    .from("cl_form_submissions")
    .insert({
      template_id: templateId,
      project_id: typedLink.project_id,
      submitted_by: null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      public_link_id: typedLink.id,
      client_name: name,
      client_email: email,
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

    if (valErr) return { error: valErr.message };
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

    if (matErr) return { error: matErr.message };
  }

  revalidatePath(`/templates/${templateId}`);
  revalidatePath(`/projects/${typedLink.project_id}`);

  return { success: true, submissionId: typedSubmission.id };
}

export interface PublicSubmissionSummary {
  submission: Pick<
    ClFormSubmission,
    | "id"
    | "client_name"
    | "client_email"
    | "submitted_at"
    | "created_at"
    | "status"
  >;
  template: Pick<
    ClFormTemplate,
    "id" | "name" | "description" | "layout_mode" | "environments"
  >;
  sections: ClFormSection[];
  fields: ClFormField[];
  values: ClSubmissionValue[];
  matrixValues: ClSubmissionValueMatrix[];
}

export async function getPublicSubmissionSummary(
  token: string,
  submissionId: string,
): Promise<
  { data: PublicSubmissionSummary; error?: never } | { data?: never; error: string }
> {
  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .from("cl_public_links")
    .select("id, is_active")
    .eq("token", token)
    .maybeSingle();

  const typedLink = link as { id: string; is_active: boolean } | null;
  if (!typedLink) return { error: "Link inválido." };
  if (!typedLink.is_active) return { error: "Link desativado." };

  const { data: submission } = await supabase
    .from("cl_form_submissions")
    .select(
      "id, template_id, public_link_id, client_name, client_email, submitted_at, created_at, status",
    )
    .eq("id", submissionId)
    .maybeSingle();

  const typedSubmission = submission as
    | (Pick<
        ClFormSubmission,
        | "id"
        | "template_id"
        | "public_link_id"
        | "client_name"
        | "client_email"
        | "submitted_at"
        | "created_at"
        | "status"
      >)
    | null;

  if (!typedSubmission) return { error: "Submissão não encontrada." };
  if (typedSubmission.public_link_id !== typedLink.id) {
    return { error: "Submissão não pertence a este link." };
  }

  const [
    { data: template },
    { data: sections },
    { data: fields },
    { data: values },
    { data: matrixValues },
  ] = await Promise.all([
    supabase
      .from("cl_form_templates")
      .select("id, name, description, layout_mode, environments")
      .eq("id", typedSubmission.template_id)
      .maybeSingle(),
    supabase
      .from("cl_form_sections")
      .select("*")
      .eq("template_id", typedSubmission.template_id)
      .order("position"),
    supabase
      .from("cl_form_fields")
      .select("*")
      .eq("template_id", typedSubmission.template_id)
      .order("position"),
    supabase
      .from("cl_submission_values")
      .select("*")
      .eq("submission_id", typedSubmission.id),
    supabase
      .from("cl_submission_values_matrix")
      .select("*")
      .eq("submission_id", typedSubmission.id),
  ]);

  if (!template) return { error: "Formulário não encontrado." };

  return {
    data: {
      submission: {
        id: typedSubmission.id,
        client_name: typedSubmission.client_name,
        client_email: typedSubmission.client_email,
        submitted_at: typedSubmission.submitted_at,
        created_at: typedSubmission.created_at,
        status: typedSubmission.status,
      },
      template: template as Pick<
        ClFormTemplate,
        "id" | "name" | "description" | "layout_mode" | "environments"
      >,
      sections: (sections ?? []) as ClFormSection[],
      fields: (fields ?? []) as ClFormField[],
      values: (values ?? []) as ClSubmissionValue[],
      matrixValues: (matrixValues ?? []) as ClSubmissionValueMatrix[],
    },
  };
}
