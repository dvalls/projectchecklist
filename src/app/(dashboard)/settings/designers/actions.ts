"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface DesignerInput {
  name: string;
  role: string | null;
  photo_url: string | null;
}

export async function createDesigner(input: DesignerInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = input.name.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase.from("cl_designers").insert({
    name,
    role: input.role?.trim() || null,
    photo_url: input.photo_url || null,
    created_by: user.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/designers");
  return { success: true };
}

export async function updateDesigner(id: string, input: DesignerInput) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = input.name.trim();
  if (!name) return { error: "Nome é obrigatório." };

  const { error } = await supabase
    .from("cl_designers")
    .update({
      name,
      role: input.role?.trim() || null,
      photo_url: input.photo_url || null,
    })
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/designers");
  return { success: true };
}

export async function deleteDesigner(id: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("cl_designers")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings/designers");
  return { success: true };
}
