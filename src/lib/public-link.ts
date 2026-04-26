import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ClProject, ClPublicLink } from "@/lib/supabase/types";

export type PublicLinkLookup =
  | { status: "not-found" }
  | { status: "inactive"; link: ClPublicLink }
  | { status: "ok"; link: ClPublicLink; project: ClProject };

export async function getActivePublicLink(token: string): Promise<PublicLinkLookup> {
  const supabase = createServiceRoleClient();

  const { data: linkRow } = await supabase
    .from("cl_public_links")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!linkRow) return { status: "not-found" };
  const link = linkRow as ClPublicLink;
  if (!link.is_active) return { status: "inactive", link };

  const { data: projectRow } = await supabase
    .from("cl_projects")
    .select("*")
    .eq("id", link.project_id)
    .maybeSingle();

  if (!projectRow) return { status: "not-found" };

  return { status: "ok", link, project: projectRow as ClProject };
}
