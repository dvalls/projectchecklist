import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClFormField,
  ClFormSection,
  ClFormTemplate,
  ClPublicLink,
} from "@/lib/supabase/types";

import { PublicFillWrapper } from "./public-fill-wrapper";

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

  const [{ data: sections }, { data: fields }] = await Promise.all([
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
  ]);

  return (
    <PublicFillWrapper
      token={typedLink.token}
      template={template as ClFormTemplate}
      sections={(sections ?? []) as ClFormSection[]}
      fields={(fields ?? []) as ClFormField[]}
    />
  );
}
