"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type {
  ColumnSpan,
  FieldOptions,
  FieldType,
  LayoutMode,
  SectionColumns,
  VisibleWhen,
} from "@/lib/supabase/types";

export interface FieldInput {
  id?: string;
  section_id: string | null;
  section_local_id: string | null;
  group_key?: string | null;
  label: string;
  help_text?: string | null;
  type: FieldType;
  required: boolean;
  column_span: ColumnSpan;
  position: number;
  options: FieldOptions;
  visible_when: VisibleWhen | null;
  visible_when_local_id: string | null;
}

export interface SectionInput {
  id?: string;
  local_id: string;
  title: string;
  subtitle: string | null;
  columns: SectionColumns;
  position: number;
}

export interface TemplateSavePayload {
  name: string;
  description: string | null;
  layout_mode: LayoutMode;
  environments: string[] | null;
  sections: SectionInput[];
  fields: FieldInput[];
}

export async function saveTemplate(
  templateId: string,
  payload: TemplateSavePayload,
) {
  const supabase = createClient();

  if (!payload.name.trim()) return { error: "Nome é obrigatório." };

  if (payload.layout_mode === "matrix") {
    const envs = (payload.environments ?? [])
      .map((e) => e.trim())
      .filter(Boolean);
    if (envs.length === 0) {
      return {
        error: "Matriz requer pelo menos um ambiente.",
      };
    }
    payload.environments = envs;
  } else {
    payload.environments = null;
  }

  const { error: metaErr } = await supabase
    .from("cl_form_templates")
    .update({
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      layout_mode: payload.layout_mode,
      environments: payload.environments,
    })
    .eq("id", templateId);

  if (metaErr) return { error: metaErr.message };

  const { data: existingSections, error: secFetchErr } = await supabase
    .from("cl_form_sections")
    .select("id")
    .eq("template_id", templateId);
  if (secFetchErr) return { error: secFetchErr.message };

  const incomingSectionIds = new Set(
    payload.sections
      .map((s) => s.id)
      .filter((v): v is string => Boolean(v)),
  );
  const sectionsToDelete =
    existingSections
      ?.filter((s) => !incomingSectionIds.has(s.id))
      .map((s) => s.id) ?? [];

  if (sectionsToDelete.length > 0) {
    const { error } = await supabase
      .from("cl_form_sections")
      .delete()
      .in("id", sectionsToDelete);
    if (error) return { error: error.message };
  }

  const localToRealSection = new Map<string, string>();

  for (const section of payload.sections) {
    if (section.id) {
      localToRealSection.set(section.local_id, section.id);
      const { error } = await supabase
        .from("cl_form_sections")
        .update({
          title: section.title,
          subtitle: section.subtitle,
          columns: section.columns,
          position: section.position,
        })
        .eq("id", section.id);
      if (error) return { error: error.message };
    } else {
      const { data, error } = await supabase
        .from("cl_form_sections")
        .insert({
          template_id: templateId,
          title: section.title,
          subtitle: section.subtitle,
          columns: section.columns,
          position: section.position,
        })
        .select("id")
        .single();
      if (error || !data) {
        return { error: error?.message ?? "Erro ao criar seção." };
      }
      localToRealSection.set(section.local_id, (data as { id: string }).id);
    }
  }

  const { data: existingFields, error: fieldFetchErr } = await supabase
    .from("cl_form_fields")
    .select("id")
    .eq("template_id", templateId);
  if (fieldFetchErr) return { error: fieldFetchErr.message };

  const incomingFieldIds = new Set(
    payload.fields.map((f) => f.id).filter((v): v is string => Boolean(v)),
  );
  const fieldsToDelete =
    existingFields
      ?.filter((f) => !incomingFieldIds.has(f.id))
      .map((f) => f.id) ?? [];

  if (fieldsToDelete.length > 0) {
    const { error } = await supabase
      .from("cl_form_fields")
      .delete()
      .in("id", fieldsToDelete);
    if (error) return { error: error.message };
  }

  const localToRealField = new Map<string, string>();

  const fieldsWithSections = payload.fields.map((f) => ({
    ...f,
    section_id: f.section_local_id
      ? localToRealSection.get(f.section_local_id) ?? null
      : null,
  }));

  for (const field of fieldsWithSections) {
    if (field.id) {
      const { error } = await supabase
        .from("cl_form_fields")
        .update({
          section_id: field.section_id,
          group_key: field.group_key ?? null,
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
      localToRealField.set(field.visible_when_local_id ?? field.id, field.id);
    } else {
      const { data, error } = await supabase
        .from("cl_form_fields")
        .insert({
          template_id: templateId,
          section_id: field.section_id,
          group_key: field.group_key ?? null,
          label: field.label,
          help_text: field.help_text ?? null,
          type: field.type,
          required: field.required,
          column_span: field.column_span,
          position: field.position,
          options: field.options,
        })
        .select("id")
        .single();
      if (error || !data) {
        return { error: error?.message ?? "Erro ao criar campo." };
      }
      const newId = (data as { id: string }).id;
      if (field.visible_when_local_id) {
        localToRealField.set(field.visible_when_local_id, newId);
      }
    }
  }

  // Second pass for visible_when — we need the full id mapping before updating.
  // Build id lookup combining existing ids and new ids.
  const idLookup = new Map<string, string>();
  for (const f of fieldsWithSections) {
    const key = f.visible_when_local_id ?? f.id;
    if (!key) continue;
    const realId = f.id ?? localToRealField.get(key);
    if (realId) idLookup.set(key, realId);
  }

  for (const field of fieldsWithSections) {
    if (!field.visible_when) {
      if (field.id) {
        const { error } = await supabase
          .from("cl_form_fields")
          .update({ visible_when: null })
          .eq("id", field.id);
        if (error) return { error: error.message };
      }
      continue;
    }

    const triggerLocalOrId = field.visible_when.field_id;
    const resolvedTrigger =
      idLookup.get(triggerLocalOrId) ?? triggerLocalOrId;

    const realFieldId =
      field.id ??
      (field.visible_when_local_id
        ? localToRealField.get(field.visible_when_local_id)
        : undefined);

    if (!realFieldId) continue;

    const { error } = await supabase
      .from("cl_form_fields")
      .update({
        visible_when: {
          field_id: resolvedTrigger,
          op: field.visible_when.op,
          value: field.visible_when.value,
        },
      })
      .eq("id", realFieldId);
    if (error) return { error: error.message };
  }

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

