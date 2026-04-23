"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { ColumnSpan, FieldOptions, FieldType } from "@/lib/supabase/types";

export interface FieldInput {
  id?: string;
  label: string;
  help_text?: string | null;
  type: FieldType;
  required: boolean;
  column_span: ColumnSpan;
  position: number;
  options: FieldOptions;
}

export async function saveTemplateFields(
  templateId: string,
  fields: FieldInput[],
) {
  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("cl_form_fields")
    .select("id")
    .eq("template_id", templateId);

  if (fetchErr) return { error: fetchErr.message };

  const incomingIds = new Set(
    fields.map((f) => f.id).filter((v): v is string => Boolean(v)),
  );
  const toDelete =
    existing?.filter((e) => !incomingIds.has(e.id)).map((e) => e.id) ?? [];

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("cl_form_fields")
      .delete()
      .in("id", toDelete);
    if (error) return { error: error.message };
  }

  for (const field of fields) {
    if (field.id) {
      const { error } = await supabase
        .from("cl_form_fields")
        .update({
          label: field.label,
          help_text: field.help_text ?? null,
          type: field.type,
          required: field.required,
          column_span: field.column_span,
          position: field.position,
          options: field.options,
        })
        .eq("id", field.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("cl_form_fields").insert({
        template_id: templateId,
        label: field.label,
        help_text: field.help_text ?? null,
        type: field.type,
        required: field.required,
        column_span: field.column_span,
        position: field.position,
        options: field.options,
      });
      if (error) return { error: error.message };
    }
  }

  revalidatePath(`/templates/${templateId}`);
  return { success: true };
}

export async function updateTemplateMeta(
  templateId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Nome é obrigatório." };

  const supabase = createClient();
  const { error } = await supabase
    .from("cl_form_templates")
    .update({
      name,
      description: description || null,
    })
    .eq("id", templateId);

  if (error) return { error: error.message };

  revalidatePath(`/templates/${templateId}`);
  return { success: true };
}

export async function deleteTemplate(templateId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cl_form_templates")
    .delete()
    .eq("id", templateId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/templates`);
  return { success: true };
}
