"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function createTemplate(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const disciplineId = String(formData.get("discipline_id") ?? "");

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cl_form_templates")
    .insert({
      project_id: projectId,
      name,
      description: description || null,
      discipline_id: disciplineId && disciplineId !== "none" ? disciplineId : null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/templates/${data.id}`);
}
