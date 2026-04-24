import { notFound } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type {
  ClDesigner,
  ClDiscipline,
  ClFormSubmission,
  ClFormTemplate,
  ClProject,
  ClProjectDesigner,
  ClPublicLink,
} from "@/lib/supabase/types";

import { PublicCover } from "./public-cover";

export const dynamic = "force-dynamic";

const BUCKET = "checklist-images";

export default async function PublicChecklistCoverPage({
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
            Este link foi desativado pelo responsável. Entre em contato para
            obter um novo.
          </p>
        </div>
      </div>
    );
  }

  const { data: project } = await supabase
    .from("cl_projects")
    .select("*")
    .eq("id", typedLink.project_id)
    .maybeSingle();

  if (!project) notFound();

  const [
    { data: disciplines },
    { data: templates },
    { data: projectDesigners },
    { data: submissions },
  ] = await Promise.all([
    supabase.from("cl_disciplines").select("*").order("position"),
    supabase
      .from("cl_form_templates")
      .select("id, discipline_id, is_public, name")
      .eq("project_id", typedLink.project_id)
      .eq("is_public", true),
    supabase
      .from("cl_project_designers")
      .select("*")
      .eq("project_id", typedLink.project_id)
      .order("position"),
    supabase
      .from("cl_form_submissions")
      .select(
        "id, template_id, client_name, client_email, submitted_at, created_at, status",
      )
      .eq("public_link_id", typedLink.id)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false }),
  ]);

  const typedProjectDesigners = (projectDesigners ?? []) as ClProjectDesigner[];
  const designerIds = typedProjectDesigners.map((d) => d.designer_id);

  let designers: ClDesigner[] = [];
  if (designerIds.length > 0) {
    const { data: designersData } = await supabase
      .from("cl_designers")
      .select("*")
      .in("id", designerIds);
    const byId = new Map(
      ((designersData ?? []) as ClDesigner[]).map((d) => [d.id, d]),
    );
    designers = typedProjectDesigners
      .map((pd) => byId.get(pd.designer_id))
      .filter((d): d is ClDesigner => Boolean(d));
  }

  const publicTemplates = (templates ?? []) as Pick<
    ClFormTemplate,
    "id" | "discipline_id" | "is_public" | "name"
  >[];

  const disciplinesInUse = new Set(
    publicTemplates.map((t) => t.discipline_id).filter(Boolean),
  );
  const relevantDisciplines = ((disciplines ?? []) as ClDiscipline[]).filter(
    (d) => disciplinesInUse.has(d.id),
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET}`;

  const typedSubmissions = (submissions ?? []) as Pick<
    ClFormSubmission,
    | "id"
    | "template_id"
    | "client_name"
    | "client_email"
    | "submitted_at"
    | "created_at"
    | "status"
  >[];

  const templatesById = new Map(
    publicTemplates.map((t) => [t.id, t.name] as const),
  );
  const history = typedSubmissions.map((s) => ({
    id: s.id,
    template_id: s.template_id,
    template_name: templatesById.get(s.template_id) ?? "Formulário",
    client_name: s.client_name,
    client_email: s.client_email,
    submitted_at: s.submitted_at ?? s.created_at,
  }));

  return (
    <PublicCover
      token={typedLink.token}
      project={project as ClProject}
      designers={designers}
      disciplines={relevantDisciplines}
      formCount={publicTemplates.length}
      publicBaseUrl={publicBaseUrl}
      history={history}
    />
  );
}
