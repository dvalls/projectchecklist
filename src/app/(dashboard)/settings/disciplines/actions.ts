"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface DisciplineInput {
  name: string;
  color: string;
  icon?: string | null;
}

export async function createDiscipline(input: DisciplineInput) {
  const name = input.name.trim();
  const color = input.color || "#3b82f6";
  if (!name) return { error: "Nome é obrigatório." };

  const supabase = createClient();

  const { count } = await supabase
    .from("cl_disciplines")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("cl_disciplines").insert({
    name,
    color,
    icon: input.icon ?? null,
    position: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe uma disciplina com este nome." };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/disciplines");
  return { success: true };
}

export async function updateDiscipline(id: string, input: DisciplineInput) {
  const name = input.name.trim();
  const color = input.color || "#3b82f6";
  if (!name) return { error: "Nome é obrigatório." };

  const supabase = createClient();
  const { error } = await supabase
    .from("cl_disciplines")
    .update({ name, color, icon: input.icon ?? null })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe uma disciplina com este nome." };
    }
    return { error: error.message };
  }

  revalidatePath("/settings/disciplines");
  return { success: true };
}

export async function deleteDiscipline(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cl_disciplines")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/settings/disciplines");
  return { success: true };
}
