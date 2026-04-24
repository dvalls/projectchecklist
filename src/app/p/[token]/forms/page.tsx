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
  ]);

  if (!project) notFound();

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
    />
  );
}
