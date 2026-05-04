"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertUser, fail, ok } from "@/lib/server-action";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type UserRole = "admin" | "member";

const createUserSchema = z.object({
  email: z.string().email("E-mail inválido."),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
  role: z.enum(["admin", "member"]),
});

const inviteUserSchema = z.object({
  email: z.string().email("E-mail inválido."),
  role: z.enum(["admin", "member"]),
});

export async function createUser(input: {
  email: string;
  password: string;
  role: UserRole;
}) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: { role: parsed.data.role },
  });

  if (error) return fail(error.message);

  revalidatePath("/settings/users");
  return ok();
}

export async function inviteUser(input: { email: string; role: UserRole }) {
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { role: parsed.data.role },
  });

  if (error) return fail(error.message);

  revalidatePath("/settings/users");
  return ok();
}

export async function updateUserRole(userId: string, role: UserRole) {
  if (!userId) return fail("ID de usuário inválido.");
  if (role !== "admin" && role !== "member") return fail("Papel inválido.");

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (error) return fail(error.message);

  revalidatePath("/settings/users");
  return ok();
}

export async function changeUserPassword(userId: string, password: string) {
  if (!userId) return fail("ID de usuário inválido.");
  if (password.length < 6) return fail("A senha deve ter no mínimo 6 caracteres.");

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });

  if (error) return fail(error.message);

  return ok();
}

export async function removeUser(userId: string) {
  if (!userId) return fail("ID de usuário inválido.");

  const supabase = createClient();
  const auth = await assertUser(supabase);
  if (!auth.user) return fail(auth.error);

  if (auth.user.id === userId) return fail("Você não pode remover sua própria conta.");

  const admin = createServiceRoleClient();
  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) return fail(error.message);

  revalidatePath("/settings/users");
  return ok();
}
