import { formatDateTime as baseFormatDateTime } from "@/lib/format";
import type { ClFormField, FieldOptions } from "@/lib/supabase/types";

export function formatFieldValue(field: ClFormField, raw: string | null): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const opts = (field.options as Exclude<FieldOptions, null>) ?? {};
  const choices = opts.choices ?? [];

  if (field.type === "checkbox") {
    return raw === "true" ? "Sim" : "Não";
  }

  if (field.type === "checkbox_group") {
    try {
      const parsed = JSON.parse(raw);
      const selectedLabels = (parsed.selected ?? []).map((v: string) => {
        const choice = choices.find((c) => c.value === v);
        return choice?.label ?? v;
      });
      const parts = [...selectedLabels];
      if (parsed.other) parts.push(`Outra: ${parsed.other}`);
      return parts.length > 0 ? parts.join(", ") : "—";
    } catch {
      return raw;
    }
  }

  if (field.type === "select" || field.type === "radio") {
    const choice = choices.find((c) => c.value === raw);
    return choice?.label ?? raw;
  }

  return raw;
}

export function formatDateTime(iso: string | null): string {
  return baseFormatDateTime(iso) || "—";
}
