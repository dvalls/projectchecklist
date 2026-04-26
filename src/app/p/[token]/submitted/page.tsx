import { notFound } from "next/navigation";

import { OFFICE_PUBLIC_FIELDS } from "@/lib/constants";
import { getActivePublicLink } from "@/lib/public-link";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import type { PublicOfficeSettings } from "../public-footer";
import { InactiveLinkCard } from "../inactive-link-card";
import { SubmissionSuccess } from "./submission-success";

export const dynamic = "force-dynamic";

export default async function PublicFormsSubmittedPage({
  params,
}: {
  params: { token: string };
}) {
  const lookup = await getActivePublicLink(params.token);
  if (lookup.status === "not-found") notFound();
  if (lookup.status === "inactive") {
    return <InactiveLinkCard description="Este link foi desativado pelo responsável." />;
  }

  const { link, project } = lookup;
  const supabase = createServiceRoleClient();

  const { data: officeSettingsData } = await supabase
    .from("cl_office_settings")
    .select(OFFICE_PUBLIC_FIELDS)
    .eq("user_id", project.created_by)
    .maybeSingle();

  const officeSettings = officeSettingsData as PublicOfficeSettings | null;

  return (
    <SubmissionSuccess
      token={link.token}
      projectName={project.name}
      officeSettings={officeSettings}
    />
  );
}
