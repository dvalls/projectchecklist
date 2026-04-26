import type { SupabaseClient } from "@supabase/supabase-js";

import { AUTH_ERROR_MESSAGE } from "@/lib/constants";

export type ActionResult<T = void> =
  | (T extends void ? { error?: never } : { data: T; error?: never })
  | { error: string; data?: never };

export function ok(): { error?: never };
export function ok<T>(data: T): { data: T; error?: never };
export function ok<T>(data?: T) {
  if (data === undefined) return {} as { error?: never };
  return { data } as { data: T; error?: never };
}

export function fail(error: string): { error: string; data?: never } {
  return { error };
}

export type AssertUserSuccess = {
  user: { id: string; email?: string };
  error?: never;
};
export type AssertUserFailure = { user?: never; error: string };
export type AssertUserResult = AssertUserSuccess | AssertUserFailure;

export async function assertUser(supabase: SupabaseClient): Promise<AssertUserResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: AUTH_ERROR_MESSAGE };
  return { user: { id: user.id, email: user.email ?? undefined } };
}
