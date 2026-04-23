"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function createSequence(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cl_checklist_sequences")
    .insert({
      project_id: projectId,
      name,
      description: description || null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/checklists/${data.id}`);
}
