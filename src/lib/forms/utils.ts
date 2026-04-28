import type { ClFormField, VisibleWhen } from "@/lib/supabase/types";

import type { CheckboxGroupValue, FieldValue } from "./types";

export function isDisplayOnly(type: ClFormField["type"]) {
  return type === "info" || type === "image";
}

export function makeFieldKey(fieldId: string, env?: string) {
  return env ? `${fieldId}::${env}` : fieldId;
}

export function parseCheckboxGroup(value: string | null): CheckboxGroupValue {
  if (!value) return { selected: [] };
  try {
    const parsed = JSON.parse(value);
    if (parsed && Array.isArray(parsed.selected)) {
      return {
        selected: parsed.selected,
        other: typeof parsed.other === "string" ? parsed.other : undefined,
      };
    }
  } catch {
    // not JSON, fallthrough
  }
  return { selected: [] };
}

export function serializeCheckboxGroup(v: CheckboxGroupValue): string | null {
  const hasOther = v.other !== undefined;
  if (v.selected.length === 0 && !hasOther) return null;
  return JSON.stringify({
    selected: v.selected,
    ...(hasOther ? { other: v.other ?? "" } : {}),
  });
}

export function parseRadioOther(value: string | null): { other: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.other === "string") {
      return { other: parsed.other };
    }
  } catch {
    // not JSON, plain value
  }
  return null;
}

export function serializeRadioOther(text: string): string {
  return JSON.stringify({ other: text });
}

export function evaluateVisible(
  condition: VisibleWhen | null,
  values: Record<string, FieldValue>,
  env?: string,
): boolean {
  if (!condition) return true;
  const targetKey = makeFieldKey(condition.field_id, env);
  const fieldVal = values[targetKey];
  if (!fieldVal) return false;
  const raw = fieldVal.value;

  if (condition.op === "truthy") {
    if (raw === null || raw === undefined || raw === "") return false;
    if (raw === "false") return false;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.selected)) {
        return parsed.selected.length > 0 || Boolean(parsed.other);
      }
    } catch {
      // not JSON, fallthrough
    }
    return true;
  }

  if (condition.op === "eq") {
    return raw === condition.value;
  }

  if (condition.op === "includes") {
    if (!condition.value) return false;
    try {
      const parsed = JSON.parse(raw ?? "");
      if (parsed && Array.isArray(parsed.selected)) {
        return parsed.selected.includes(condition.value);
      }
    } catch {
      // not JSON
    }
    return raw === condition.value;
  }

  return true;
}

export function isFieldAnswered(field: ClFormField, v: FieldValue | undefined): boolean {
  if (field.type === "checkbox") return v?.value === "true";
  if (field.type === "checkbox_group") {
    const parsed = parseCheckboxGroup(v?.value ?? null);
    return parsed.selected.length > 0 || Boolean(parsed.other);
  }
  if (field.type === "radio") {
    const radioOther = parseRadioOther(v?.value ?? null);
    if (radioOther !== null) return Boolean(radioOther.other);
    return Boolean(v?.value);
  }
  return Boolean(v?.value && v.value.trim() !== "");
}
