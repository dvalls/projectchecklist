"use server";

import { revalidatePath } from "next/cache";

import { disciplineInputSchema, type DisciplineInput } from "@/lib/schemas/disciplines";
import { fail, ok } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";

export type { DisciplineInput };

export async function createDiscipline(input: DisciplineInput) {
  const parsed = disciplineInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { name, color, icon } = parsed.data;

  const supabase = createClient();

  const { count } = await supabase
    .from("cl_disciplines")
    .select("id", { count: "exact", head: true });

  const { error } = await supabase.from("cl_disciplines").insert({
    name,
    color,
    icon: icon ?? null,
    position: count ?? 0,
  });

  if (error) {
    if (error.code === "23505") {
      return fail("Já existe uma disciplina com este nome.");
    }
    return fail(error.message);
  }

  revalidatePath("/settings/disciplines");
  return ok();
}

export async function updateDiscipline(id: string, input: DisciplineInput) {
  const parsed = disciplineInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }
  const { name, color, icon } = parsed.data;

  const supabase = createClient();
  const { error } = await supabase
    .from("cl_disciplines")
    .update({ name, color, icon: icon ?? null })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return fail("Já existe uma disciplina com este nome.");
    }
    return fail(error.message);
  }

  revalidatePath("/settings/disciplines");
  return ok();
}

export async function deleteDiscipline(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("cl_disciplines").delete().eq("id", id);

  if (error) return fail(error.message);

  revalidatePath("/settings/disciplines");
  return ok();
}
