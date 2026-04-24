"use client";

export interface PublicIdentity {
  client_name: string;
  client_email: string;
}

function storageKey(token: string) {
  return `checklist.public.${token}`;
}

export function readIdentity(token: string): PublicIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PublicIdentity>;
    if (!parsed.client_name || !parsed.client_email) return null;
    return {
      client_name: parsed.client_name,
      client_email: parsed.client_email,
    };
  } catch {
    return null;
  }
}

export function writeIdentity(token: string, identity: PublicIdentity) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(token), JSON.stringify(identity));
  } catch {
    // ignore
  }
}

export function clearIdentity(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(token));
  } catch {
    // ignore
  }
}
