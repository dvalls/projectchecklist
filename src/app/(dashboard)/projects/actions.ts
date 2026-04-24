"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) {
    return { error: "Nome do projeto é obrigatório." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuário não autenticado." };
  }

  const { data, error } = await supabase
    .from("cl_projects")
    .insert({
      name,
      description: description || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function deleteProject(projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cl_projects")
    .delete()
    .eq("id", projectId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/projects");
  return { success: true };
}

export async function renameProject(projectId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nome é obrigatório." };

  const supabase = createClient();
  const { error } = await supabase
    .from("cl_projects")
    .update({ name: trimmed })
    .eq("id", projectId);

  if (error) return { error: error.message };

  revalidatePath("/projects");
  return { success: true };
}

export async function duplicateProject(projectId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Não autenticado." };

  const { data: project, error: fetchError } = await supabase
    .from("cl_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) return { error: "Projeto não encontrado." };

  const { error } = await supabase.from("cl_projects").insert({
    name: `Cópia de ${project.name}`,
    description: project.description ?? null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/projects");
  return { success: true };
}
