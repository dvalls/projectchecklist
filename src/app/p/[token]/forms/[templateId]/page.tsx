import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClFormField,
  ClFormSection,
  ClFormTemplate,
  ClProject,
  ClPublicLink,
  ClSubmissionValue,
  ClSubmissionValueMatrix,
} from "@/lib/supabase/types";
import type { PublicOfficeSettings } from "../../public-footer";

import {
  PublicFillWrapper,
  type PreviousFieldValue,
  type PreviousValuesMap,
  type PreviousMatrixValuesMap,
} from "./public-fill-wrapper";

export const dynamic = "force-dynamic";

export default async function PublicFormFillPage({
  params,
}: {
  params: { token: string; templateId: string };
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

  const { data: template } = await supabase
    .from("cl_form_templates")
    .select("*")
    .eq("id", params.templateId)
    .eq("project_id", typedLink.project_id)
    .eq("is_public", true)
    .maybeSingle();

  if (!template) notFound();

  const [
    { data: sections },
    { data: fields },
    { data: project },
    { data: priorSubmissions },
  ] = await Promise.all([
    supabase
      .from("cl_form_sections")
      .select("*")
      .eq("template_id", params.templateId)
      .order("position"),
    supabase
      .from("cl_form_fields")
      .select("*")
      .eq("template_id", params.templateId)
      .order("position"),
    supabase
      .from("cl_projects")
      .select("created_by, allow_resubmit_answers")
      .eq("id", typedLink.project_id)
      .maybeSingle(),
    supabase
      .from("cl_form_submissions")
      .select("id, submitted_at, created_at")
      .eq("project_id", typedLink.project_id)
      .eq("template_id", params.templateId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false }),
  ]);

  const typedProject = project as Pick<
    ClProject,
    "created_by" | "allow_resubmit_answers"
  > | null;

  const { data: officeSettingsData } = typedProject
    ? await supabase
        .from("cl_office_settings")
        .select(
          "office_name, logo_url, website, instagram, facebook, linkedin, twitter, whatsapp",
        )
        .eq("user_id", typedProject.created_by)
        .maybeSingle()
    : { data: null };

  const officeSettings = officeSettingsData as PublicOfficeSettings | null;

  const typedPriorSubmissions = (priorSubmissions ?? []) as {
    id: string;
    submitted_at: string | null;
    created_at: string;
  }[];

  const submissionOrder = new Map(
    typedPriorSubmissions.map((s, i) => [s.id, i] as const),
  );

  const previousByField: PreviousValuesMap = {};
  const previousByMatrix: PreviousMatrixValuesMap = {};

  if (typedPriorSubmissions.length > 0) {
    const submissionIds = typedPriorSubmissions.map((s) => s.id);

    const [{ data: priorValues }, { data: priorMatrixValues }] = await Promise.all([
      supabase
        .from("cl_submission_values")
        .select("submission_id, field_id, value, image_url")
        .in("submission_id", submissionIds),
      supabase
        .from("cl_submission_values_matrix")
        .select("submission_id, field_id, env_key, value, image_url")
        .in("submission_id", submissionIds),
    ]);

    const typedPriorValues = (priorValues ?? []) as Pick<
      ClSubmissionValue,
      "submission_id" | "field_id" | "value" | "image_url"
    >[];
    const typedPriorMatrixValues = (priorMatrixValues ?? []) as Pick<
      ClSubmissionValueMatrix,
      "submission_id" | "field_id" | "env_key" | "value" | "image_url"
    >[];

    function isMoreRecent(nextId: string, currentId: string) {
      const a = submissionOrder.get(nextId) ?? Number.POSITIVE_INFINITY;
      const b = submissionOrder.get(currentId) ?? Number.POSITIVE_INFINITY;
      return a < b;
    }

    for (const v of typedPriorValues) {
      if (v.value === null && !v.image_url) continue;
      const existing = previousByField[v.field_id];
      if (!existing || isMoreRecent(v.submission_id, existing.submission_id)) {
        previousByField[v.field_id] = {
          value: v.value,
          image_url: v.image_url,
          submission_id: v.submission_id,
        } satisfies PreviousFieldValue;
      }
    }

    for (const v of typedPriorMatrixValues) {
      if (v.value === null && !v.image_url) continue;
      const bucket = previousByMatrix[v.field_id] ?? {};
      const existing = bucket[v.env_key];
      if (!existing || isMoreRecent(v.submission_id, existing.submission_id)) {
        bucket[v.env_key] = {
          value: v.value,
          image_url: v.image_url,
          submission_id: v.submission_id,
        } satisfies PreviousFieldValue;
      }
      previousByMatrix[v.field_id] = bucket;
    }
  }

  const allowResubmit = Boolean(typedProject?.allow_resubmit_answers);

  return (
    <PublicFillWrapper
      token={typedLink.token}
      template={template as ClFormTemplate}
      sections={(sections ?? []) as ClFormSection[]}
      fields={(fields ?? []) as ClFormField[]}
      officeSettings={officeSettings}
      previousByField={previousByField}
      previousByMatrix={previousByMatrix}
      allowResubmit={allowResubmit}
    />
  );
}
