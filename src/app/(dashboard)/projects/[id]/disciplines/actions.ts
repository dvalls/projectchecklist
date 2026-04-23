"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export async function createDiscipline(
  projectId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#3b82f6");

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = createClient();
  const { count } = await supabase
    .from("cl_disciplines")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  const { error } = await supabase.from("cl_disciplines").insert({
    project_id: projectId,
    name,
    color,
    position: count ?? 0,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/disciplines");
  return { success: true };
}

export async function deleteDiscipline(
  disciplineId: string,
  projectId: string,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cl_disciplines")
    .delete()
    .eq("id", disciplineId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/disciplines");
  return { success: true };
}
