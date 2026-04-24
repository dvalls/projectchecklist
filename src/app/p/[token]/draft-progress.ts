"use client";

export interface DraftProgress {
  done: number;
  total: number;
  updatedAt: number;
}

function storageKey(token: string, templateId: string, email: string) {
  return `checklist.public.progress.${token}.${templateId}.${email.toLowerCase()}`;
}

export function readDraftProgress(
  token: string,
  templateId: string,
  email: string,
): DraftProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(
      storageKey(token, templateId, email),
    );
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftProgress>;
    if (
      typeof parsed.done !== "number" ||
      typeof parsed.total !== "number"
    ) {
      return null;
    }
    return {
      done: parsed.done,
      total: parsed.total,
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return null;
  }
}

export function writeDraftProgress(
  token: string,
  templateId: string,
  email: string,
  progress: Omit<DraftProgress, "updatedAt">,
) {
  if (typeof window === "undefined") return;
  try {
    const payload: DraftProgress = {
      ...progress,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(
      storageKey(token, templateId, email),
      JSON.stringify(payload),
    );
    window.dispatchEvent(
      new CustomEvent("checklist-progress", {
        detail: { token, templateId, email: email.toLowerCase() },
      }),
    );
  } catch {
    // ignore
  }
}

export function clearDraftProgress(
  token: string,
  templateId: string,
  email: string,
) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(storageKey(token, templateId, email));
    window.dispatchEvent(
      new CustomEvent("checklist-progress", {
        detail: { token, templateId, email: email.toLowerCase() },
      }),
    );
  } catch {
    // ignore
  }
}
