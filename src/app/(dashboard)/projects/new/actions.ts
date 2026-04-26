"use server";

import { revalidatePath } from "next/cache";

import { assertUser } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";

export async function createProjectDraft(input: { name: string; description: string }) {
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name) {
    return { error: "Nome do projeto é obrigatório." } as const;
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return { error: auth.error } as const;

  const { data, error } = await supabase
    .from("cl_projects")
    .insert({
      name,
      description: description || null,
      created_by: auth.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Erro ao criar projeto." } as const;
  }

  revalidatePath("/projects");
  return { projectId: (data as { id: string }).id } as const;
}

export async function updateProjectBasics(
  projectId: string,
  input: { name: string; description: string },
) {
  const name = input.name.trim();
  const description = input.description.trim();

  if (!name) {
    return { error: "Nome do projeto é obrigatório." } as const;
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return { error: auth.error } as const;

  const { error } = await supabase
    .from("cl_projects")
    .update({ name, description: description || null })
    .eq("id", projectId);

  if (error) return { error: error.message } as const;

  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { success: true } as const;
}

export async function createTemplateBlank(
  projectId: string,
  input: { name: string; discipline_id: string | null },
) {
  const name = input.name.trim();
  if (!name) {
    return { error: "Nome do formulário é obrigatório." } as const;
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return { error: auth.error } as const;

  const { data, error } = await supabase
    .from("cl_form_templates")
    .insert({
      project_id: projectId,
      name,
      description: null,
      discipline_id:
        input.discipline_id && input.discipline_id !== "none"
          ? input.discipline_id
          : null,
    })
    .select("id, name")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Erro ao criar formulário." } as const;
  }

  revalidatePath(`/projects/${projectId}`);
  return {
    templateId: (data as { id: string; name: string }).id,
    name: (data as { id: string; name: string }).name,
  } as const;
}

export async function discardDraftProject(projectId: string) {
  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return { error: auth.error } as const;

  const { error } = await supabase.from("cl_projects").delete().eq("id", projectId);

  if (error) return { error: error.message } as const;

  revalidatePath("/projects");
  return { success: true } as const;
}
