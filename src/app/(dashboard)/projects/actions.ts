"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { projectCreateSchema, projectRenameSchema } from "@/lib/schemas/projects";
import { assertUser, fail, ok } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";

export async function createProject(formData: FormData) {
  const parsed = projectCreateSchema.safeParse({
    name: formData.get("name") ?? "",
    description: formData.get("description") ?? null,
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const { data, error } = await supabase
    .from("cl_projects")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (error) return fail(error.message);

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function deleteProject(projectId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("cl_projects").delete().eq("id", projectId);

  if (error) return fail(error.message);

  revalidatePath("/projects");
  return ok();
}

export async function renameProject(projectId: string, name: string) {
  const parsed = projectRenameSchema.safeParse({ id: projectId, name });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("cl_projects")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id);

  if (error) return fail(error.message);

  revalidatePath("/projects");
  return ok();
}

export async function duplicateProject(projectId: string) {
  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const { data: project, error: fetchError } = await supabase
    .from("cl_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (fetchError || !project) return fail("Projeto não encontrado.");

  const { error } = await supabase.from("cl_projects").insert({
    name: `Cópia de ${project.name}`,
    description: project.description ?? null,
    created_by: auth.user.id,
  });

  if (error) return fail(error.message);

  revalidatePath("/projects");
  return ok();
}
