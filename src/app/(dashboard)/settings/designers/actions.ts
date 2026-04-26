"use server";

import { revalidatePath } from "next/cache";

import { designerInputSchema, type DesignerInput } from "@/lib/schemas/designers";
import { assertUser, fail, ok } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";

export type { DesignerInput };

export async function createDesigner(input: DesignerInput) {
  const parsed = designerInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const { name, role, formation, photo_url } = parsed.data;

  const { error } = await supabase.from("cl_designers").insert({
    name,
    role: role?.trim() || null,
    formation: formation?.trim() || null,
    photo_url: photo_url || null,
    created_by: auth.user.id,
  });

  if (error) return fail(error.message);

  revalidatePath("/settings/designers");
  return ok();
}

export async function updateDesigner(id: string, input: DesignerInput) {
  const parsed = designerInputSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const { name, role, formation, photo_url } = parsed.data;

  const { error } = await supabase
    .from("cl_designers")
    .update({
      name,
      role: role?.trim() || null,
      formation: formation?.trim() || null,
      photo_url: photo_url || null,
    })
    .eq("id", id);

  if (error) return fail(error.message);

  revalidatePath("/settings/designers");
  return ok();
}

export async function deleteDesigner(id: string) {
  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const { error } = await supabase.from("cl_designers").delete().eq("id", id);

  if (error) return fail(error.message);

  revalidatePath("/settings/designers");
  return ok();
}
