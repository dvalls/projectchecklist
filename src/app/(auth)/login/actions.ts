"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { signInSchema, signUpSchema } from "@/lib/schemas/auth";
import { fail, ok } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  redirect("/projects");
}

export async function signUp(formData: FormData) {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp(parsed.data);

  if (error) return fail(error.message);

  return {
    ...ok(),
    success: "Conta criada. Verifique seu email se a confirmação estiver habilitada.",
  };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
