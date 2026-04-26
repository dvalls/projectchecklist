import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: officeSettings } = await supabase
    .from("cl_office_settings")
    .select("office_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-muted/30">
      <Topbar
        userEmail={user.email ?? ""}
        officeName={officeSettings?.office_name ?? null}
      />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
