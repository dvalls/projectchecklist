import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClDiscipline,
  ClFormField,
  ClFormSubmission,
  ClFormTemplate,
  ClProject,
  ClPublicLink,
} from "@/lib/supabase/types";
import type { PublicOfficeSettings } from "../public-footer";

import { PublicFormsList } from "./public-forms-list";

export const dynamic = "force-dynamic";

export default async function PublicFormsListPage({
  params,
}: {
  params: { token: string };
}) {
  const supabase = createServiceRoleClient();

  const { data: link } = await supabase
    .from("cl_public_links")
    .select("*")
    .eq("token", params.token)
    .maybeSingle();

  if (!link) notFound();

  const typedLink = link as ClPublicLink;

  if (!typedLink.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <div className="max-w-md space-y-3 rounded-lg border bg-background p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">
            Este link foi desativado pelo responsável.
          </p>
        </div>
      </div>
    );
  }

  const [
    { data: project },
    { data: disciplines },
    { data: templates },
    { data: submissions },
    { data: projectSubmissions },
  ] = await Promise.all([
    supabase
      .from("cl_projects")
      .select("*")
      .eq("id", typedLink.project_id)
      .maybeSingle(),
    supabase.from("cl_disciplines").select("*").order("position"),
    supabase
      .from("cl_form_templates")
      .select("*")
      .eq("project_id", typedLink.project_id)
      .eq("is_public", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("cl_form_submissions")
      .select("id, template_id, client_email, status")
      .eq("public_link_id", typedLink.id),
    supabase
      .from("cl_form_submissions")
      .select("id, template_id")
      .eq("project_id", typedLink.project_id)
      .eq("status", "submitted"),
  ]);

  if (!project) notFound();

  const { data: officeSettingsData } = await supabase
    .from("cl_office_settings")
    .select("office_name, logo_url, website, instagram, facebook, linkedin, twitter, whatsapp")
    .eq("user_id", (project as ClProject).created_by)
    .maybeSingle();

  const officeSettings = officeSettingsData as PublicOfficeSettings | null;

  const typedTemplates = (templates ?? []) as ClFormTemplate[];
  const templateIds = typedTemplates.map((t) => t.id);

  const { data: requiredFields } = templateIds.length
    ? await supabase
        .from("cl_form_fields")
        .select("template_id, type")
        .in("template_id", templateIds)
        .eq("required", true)
    : { data: [] as Pick<ClFormField, "template_id" | "type">[] };

  const typedRequiredFields = (requiredFields ?? []) as Pick<
    ClFormField,
    "template_id" | "type"
  >[];

  const requiredCountByTemplate: Record<string, number> = {};
  for (const t of typedTemplates) {
    const baseCount = typedRequiredFields.filter(
      (f) =>
        f.template_id === t.id &&
        f.type !== "info" &&
        f.type !== "image",
    ).length;
    const envCount =
      t.layout_mode === "matrix"
        ? Math.max(1, (t.environments ?? []).length)
        : 1;
    requiredCountByTemplate[t.id] = baseCount * envCount;
  }

  const typedProjectSubmissions = (projectSubmissions ?? []) as Pick<
    ClFormSubmission,
    "id" | "template_id"
  >[];

  const hasPreviousByTemplate: Record<string, boolean> = {};
  if (typedProjectSubmissions.length > 0) {
    const submissionIds = typedProjectSubmissions.map((s) => s.id);
    const [{ data: anyValues }, { data: anyMatrix }] = await Promise.all([
      supabase
        .from("cl_submission_values")
        .select("submission_id")
        .in("submission_id", submissionIds),
      supabase
        .from("cl_submission_values_matrix")
        .select("submission_id")
        .in("submission_id", submissionIds),
    ]);
    const withValues = new Set<string>();
    for (const row of (anyValues ?? []) as { submission_id: string }[]) {
      withValues.add(row.submission_id);
    }
    for (const row of (anyMatrix ?? []) as { submission_id: string }[]) {
      withValues.add(row.submission_id);
    }
    for (const s of typedProjectSubmissions) {
      if (withValues.has(s.id)) {
        hasPreviousByTemplate[s.template_id] = true;
      }
    }
  }

  const allowResubmit = Boolean(
    (project as ClProject).allow_resubmit_answers,
  );

  return (
    <PublicFormsList
      token={typedLink.token}
      project={project as ClProject}
      disciplines={(disciplines ?? []) as ClDiscipline[]}
      templates={typedTemplates}
      submissions={
        (submissions ?? []) as Pick<
          ClFormSubmission,
          "id" | "template_id" | "client_email" | "status"
        >[]
      }
      requiredCountByTemplate={requiredCountByTemplate}
      hasPreviousByTemplate={hasPreviousByTemplate}
      allowResubmit={allowResubmit}
      officeSettings={officeSettings}
    />
  );
}
