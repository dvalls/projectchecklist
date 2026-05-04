import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

import { UsersManager } from "./users-manager";

export const dynamic = "force-dynamic";

export default async function SettingsUsersPage() {
  const supabase = createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const { data } = await admin.auth.admin.listUsers();

  const users = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    role: (u.app_metadata?.role as string | undefined) ?? "member",
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
  }));

  return <UsersManager users={users} currentUserId={currentUser?.id ?? ""} />;
}
