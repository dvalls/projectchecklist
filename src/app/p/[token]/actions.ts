"use server";

import { revalidatePath } from "next/cache";

import { assertUser } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClDesigner,
  ClDiscipline,
  ClFormField,
  ClFormSection,
  ClFormSubmission,
  ClFormTemplate,
  ClOfficeSettings,
  ClProject,
  ClProjectDesigner,
  ClSubmissionValue,
  ClSubmissionValueMatrix,
} from "@/lib/supabase/types";

import { BUCKETS } from "@/lib/constants";
import type { SubmissionMatrixValueInput, SubmissionValueInput } from "@/lib/forms/types";
import { identityIdentificationSchema } from "@/lib/schemas/public-link";
import { getPublicBucketBaseUrl } from "@/lib/storage";

const BUCKET = BUCKETS.CHECKLIST_IMAGES;

export type PublicSubmissionValueInput = SubmissionValueInput;
export type PublicSubmissionMatrixValueInput = SubmissionMatrixValueInput;

export interface CreatePublicSubmissionInput {
  token: string;
  template_id?: string;
  client_name: string;
  client_email: string;
  values: PublicSubmissionValueInput[];
  matrix_values?: PublicSubmissionMatrixValueInput[];
}

export async function createPublicSubmission(input: CreatePublicSubmissionInput) {
  const parsed = identityIdentificationSchema.safeParse({
    client_name: input.client_name,
    client_email: input.client_email,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { client_name: name, client_email: email } = parsed.data;

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
    const typedTpl = tpl as { id: string; project_id: string; is_public: boolean } | null;
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

    const { error: valErr } = await supabase.from("cl_submission_values").insert(rows);

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
  revalidatePath(`/p/${input.token}`, "layout");

  return { success: true, submissionId: typedSubmission.id };
}

export interface PublicSubmissionSummary {
  submission: Pick<
    ClFormSubmission,
    "id" | "client_name" | "client_email" | "submitted_at" | "created_at" | "status"
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

  const typedSubmission = submission as Pick<
    ClFormSubmission,
    | "id"
    | "template_id"
    | "public_link_id"
    | "client_name"
    | "client_email"
    | "submitted_at"
    | "created_at"
    | "status"
  > | null;

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

export type ReportOfficeSettings = Pick<
  ClOfficeSettings,
  "office_name" | "logo_url" | "website"
>;

export interface ReportDesigner {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
}

export interface ReportTemplateEntry {
  template: Pick<
    ClFormTemplate,
    "id" | "name" | "description" | "layout_mode" | "environments"
  >;
  sections: ClFormSection[];
  fields: ClFormField[];
  submissions: Array<{
    submission: Pick<
      ClFormSubmission,
      "id" | "client_name" | "client_email" | "submitted_at" | "created_at" | "status"
    >;
    values: ClSubmissionValue[];
    matrixValues: ClSubmissionValueMatrix[];
  }>;
}

export interface PublicFullReport {
  project: Pick<ClProject, "id" | "name" | "description" | "image_url">;
  office: ReportOfficeSettings | null;
  designers: ReportDesigner[];
  disciplines: ClDiscipline[];
  templates: ReportTemplateEntry[];
  publicBaseUrl: string;
  generatedAt: string;
}

export async function getPublicFullReport(
  token: string,
): Promise<{ data: PublicFullReport; error?: never } | { data?: never; error: string }> {
  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .from("cl_public_links")
    .select("id, project_id, is_active")
    .eq("token", token)
    .maybeSingle();

  const typedLink = link as { id: string; project_id: string; is_active: boolean } | null;
  if (!typedLink) return { error: "Link inválido." };
  if (!typedLink.is_active) return { error: "Link desativado." };

  const { data: project } = await supabase
    .from("cl_projects")
    .select("id, name, description, image_url, created_by")
    .eq("id", typedLink.project_id)
    .maybeSingle();

  const typedProject = project as
    | (Pick<ClProject, "id" | "name" | "description" | "image_url"> & {
        created_by: string;
      })
    | null;
  if (!typedProject) return { error: "Projeto não encontrado." };

  const [
    { data: templates },
    { data: submissions },
    { data: disciplines },
    { data: projectDesigners },
    { data: officeSettingsData },
  ] = await Promise.all([
    supabase
      .from("cl_form_templates")
      .select("id, name, description, layout_mode, environments, discipline_id")
      .eq("project_id", typedLink.project_id)
      .eq("is_public", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("cl_form_submissions")
      .select(
        "id, template_id, client_name, client_email, submitted_at, created_at, status",
      )
      .eq("public_link_id", typedLink.id)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true }),
    supabase.from("cl_disciplines").select("*").order("position"),
    supabase
      .from("cl_project_designers")
      .select("*")
      .eq("project_id", typedLink.project_id)
      .order("position"),
    supabase
      .from("cl_office_settings")
      .select("office_name, logo_url, website")
      .eq("user_id", typedProject.created_by)
      .maybeSingle(),
  ]);

  const typedTemplates = (templates ?? []) as Array<
    Pick<
      ClFormTemplate,
      "id" | "name" | "description" | "layout_mode" | "environments"
    > & { discipline_id: string | null }
  >;

  const typedSubmissions = (submissions ?? []) as Array<
    Pick<
      ClFormSubmission,
      | "id"
      | "template_id"
      | "client_name"
      | "client_email"
      | "submitted_at"
      | "created_at"
      | "status"
    >
  >;

  const templateIds = typedTemplates.map((t) => t.id);
  const submissionIds = typedSubmissions.map((s) => s.id);

  const [{ data: sections }, { data: fields }, { data: values }, { data: matrixValues }] =
    await Promise.all([
      templateIds.length
        ? supabase
            .from("cl_form_sections")
            .select("*")
            .in("template_id", templateIds)
            .order("position")
        : Promise.resolve({ data: [] as ClFormSection[] }),
      templateIds.length
        ? supabase
            .from("cl_form_fields")
            .select("*")
            .in("template_id", templateIds)
            .order("position")
        : Promise.resolve({ data: [] as ClFormField[] }),
      submissionIds.length
        ? supabase
            .from("cl_submission_values")
            .select("*")
            .in("submission_id", submissionIds)
        : Promise.resolve({ data: [] as ClSubmissionValue[] }),
      submissionIds.length
        ? supabase
            .from("cl_submission_values_matrix")
            .select("*")
            .in("submission_id", submissionIds)
        : Promise.resolve({ data: [] as ClSubmissionValueMatrix[] }),
    ]);

  const typedSections = (sections ?? []) as ClFormSection[];
  const typedFields = (fields ?? []) as ClFormField[];
  const typedValues = (values ?? []) as ClSubmissionValue[];
  const typedMatrix = (matrixValues ?? []) as ClSubmissionValueMatrix[];

  const sectionsByTemplate = new Map<string, ClFormSection[]>();
  for (const s of typedSections) {
    const arr = sectionsByTemplate.get(s.template_id) ?? [];
    arr.push(s);
    sectionsByTemplate.set(s.template_id, arr);
  }

  const fieldsByTemplate = new Map<string, ClFormField[]>();
  for (const f of typedFields) {
    const arr = fieldsByTemplate.get(f.template_id) ?? [];
    arr.push(f);
    fieldsByTemplate.set(f.template_id, arr);
  }

  const valuesBySubmission = new Map<string, ClSubmissionValue[]>();
  for (const v of typedValues) {
    const arr = valuesBySubmission.get(v.submission_id) ?? [];
    arr.push(v);
    valuesBySubmission.set(v.submission_id, arr);
  }

  const matrixBySubmission = new Map<string, ClSubmissionValueMatrix[]>();
  for (const v of typedMatrix) {
    const arr = matrixBySubmission.get(v.submission_id) ?? [];
    arr.push(v);
    matrixBySubmission.set(v.submission_id, arr);
  }

  const submissionsByTemplate = new Map<
    string,
    Array<(typeof typedSubmissions)[number]>
  >();
  for (const s of typedSubmissions) {
    const arr = submissionsByTemplate.get(s.template_id) ?? [];
    arr.push(s);
    submissionsByTemplate.set(s.template_id, arr);
  }

  const disciplinesInUse = new Set(
    typedTemplates.map((t) => t.discipline_id).filter(Boolean) as string[],
  );
  const relevantDisciplines = ((disciplines ?? []) as ClDiscipline[]).filter((d) =>
    disciplinesInUse.has(d.id),
  );

  const typedProjectDesigners = (projectDesigners ?? []) as ClProjectDesigner[];
  let designers: ReportDesigner[] = [];
  if (typedProjectDesigners.length > 0) {
    const designerIds = typedProjectDesigners.map((d) => d.designer_id);
    const { data: designersData } = await supabase
      .from("cl_designers")
      .select("id, name, role, photo_url")
      .in("id", designerIds);
    const byId = new Map(
      ((designersData ?? []) as ReportDesigner[]).map((d) => [d.id, d]),
    );
    designers = typedProjectDesigners
      .map((pd) => byId.get(pd.designer_id))
      .filter((d): d is ReportDesigner => Boolean(d));
  }

  const templatesReport: ReportTemplateEntry[] = typedTemplates
    .map((t) => {
      const subs = (submissionsByTemplate.get(t.id) ?? []).map((s) => ({
        submission: s,
        values: valuesBySubmission.get(s.id) ?? [],
        matrixValues: matrixBySubmission.get(s.id) ?? [],
      }));
      return {
        template: {
          id: t.id,
          name: t.name,
          description: t.description,
          layout_mode: t.layout_mode,
          environments: t.environments,
        },
        sections: sectionsByTemplate.get(t.id) ?? [],
        fields: fieldsByTemplate.get(t.id) ?? [],
        submissions: subs,
      };
    })
    .filter((entry) => entry.submissions.length > 0);

  const publicBaseUrl = getPublicBucketBaseUrl(BUCKET);

  return {
    data: {
      project: {
        id: typedProject.id,
        name: typedProject.name,
        description: typedProject.description,
        image_url: typedProject.image_url,
      },
      office: (officeSettingsData ?? null) as ReportOfficeSettings | null,
      designers,
      disciplines: relevantDisciplines,
      templates: templatesReport,
      publicBaseUrl,
      generatedAt: new Date().toISOString(),
    },
  };
}

export async function deletePublicSubmission(
  token: string,
  submissionId: string,
): Promise<{ error?: string }> {
  const supabaseAuth = createClient();
  const authResult = await assertUser(supabaseAuth);
  if (!authResult.user) return { error: authResult.error };

  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .from("cl_public_links")
    .select("id, project_id, is_active")
    .eq("token", token)
    .maybeSingle();

  const typedLink = link as { id: string; project_id: string; is_active: boolean } | null;
  if (!typedLink) return { error: "Link inválido." };
  if (!typedLink.is_active) return { error: "Link desativado." };

  const { data: project } = await supabase
    .from("cl_projects")
    .select("id, created_by")
    .eq("id", typedLink.project_id)
    .maybeSingle();

  const typedProject = project as { id: string; created_by: string } | null;
  if (!typedProject) return { error: "Projeto não encontrado." };

  if (typedProject.created_by !== authResult.user.id) {
    return { error: "Sem permissão para excluir este preenchimento." };
  }

  const { data: submission } = await supabase
    .from("cl_form_submissions")
    .select("id, public_link_id")
    .eq("id", submissionId)
    .maybeSingle();

  const typedSubmission = submission as {
    id: string;
    public_link_id: string | null;
  } | null;

  if (!typedSubmission) return { error: "Preenchimento não encontrado." };
  if (typedSubmission.public_link_id !== typedLink.id) {
    return { error: "Preenchimento não pertence a este link." };
  }

  await Promise.all([
    supabase.from("cl_submission_values").delete().eq("submission_id", submissionId),
    supabase
      .from("cl_submission_values_matrix")
      .delete()
      .eq("submission_id", submissionId),
  ]);

  const { error: deleteError } = await supabase
    .from("cl_form_submissions")
    .delete()
    .eq("id", submissionId);

  if (deleteError) return { error: deleteError.message };

  revalidatePath(`/p/${token}`, "layout");
  revalidatePath(`/projects/${typedLink.project_id}`);

  return {};
}
