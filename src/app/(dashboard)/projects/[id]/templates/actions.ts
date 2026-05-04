"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  ClFormField,
  ClFormSection,
  ClFormTemplate,
  VisibleWhen,
} from "@/lib/supabase/types";

export async function createTemplate(projectId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const disciplineId = String(formData.get("discipline_id") ?? "");

  if (!name) {
    return { error: "Nome é obrigatório." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("cl_form_templates")
    .insert({
      project_id: projectId,
      name,
      description: description || null,
      discipline_id: disciplineId && disciplineId !== "none" ? disciplineId : null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/templates/${data.id}`);
}

export async function importExistingTemplate(
  targetProjectId: string,
  sourceTemplateId: string,
) {
  const supabase = createClient();

  const { data: targetProject } = await supabase
    .from("cl_projects")
    .select("id")
    .eq("id", targetProjectId)
    .maybeSingle();
  if (!targetProject) {
    return { error: "Projeto de destino não encontrado." };
  }

  const { data: source, error: sourceErr } = await supabase
    .from("cl_form_templates")
    .select("*")
    .eq("id", sourceTemplateId)
    .maybeSingle();
  if (sourceErr) return { error: sourceErr.message };
  if (!source) return { error: "Formulário de origem não encontrado." };

  const typedSource = source as ClFormTemplate;

  const { data: existing } = await supabase
    .from("cl_form_templates")
    .select("name")
    .eq("project_id", targetProjectId);
  const existingNames = new Set(
    ((existing ?? []) as { name: string }[]).map((e) => e.name),
  );
  let newName = typedSource.name;
  if (existingNames.has(newName)) {
    let suffix = 2;
    while (existingNames.has(`${typedSource.name} (${suffix})`)) suffix++;
    newName = `${typedSource.name} (${suffix})`;
  }

  let newDisciplineId: string | null = typedSource.discipline_id;
  if (newDisciplineId) {
    const { data: disc } = await supabase
      .from("cl_disciplines")
      .select("id")
      .eq("id", newDisciplineId)
      .maybeSingle();
    if (!disc) newDisciplineId = null;
  }

  const { data: createdTpl, error: tplErr } = await supabase
    .from("cl_form_templates")
    .insert({
      project_id: targetProjectId,
      discipline_id: newDisciplineId,
      name: newName,
      description: typedSource.description,
      layout_mode: typedSource.layout_mode,
      environments: typedSource.environments,
      is_public: true,
    })
    .select("id")
    .single();
  if (tplErr || !createdTpl) {
    return { error: tplErr?.message ?? "Erro ao criar formulário." };
  }
  const newTemplateId = (createdTpl as { id: string }).id;

  const { data: sections, error: secErr } = await supabase
    .from("cl_form_sections")
    .select("*")
    .eq("template_id", sourceTemplateId)
    .order("position", { ascending: true });
  if (secErr) return { error: secErr.message };

  const sectionIdMap = new Map<string, string>();
  for (const s of (sections ?? []) as ClFormSection[]) {
    const { data: newSec, error: insErr } = await supabase
      .from("cl_form_sections")
      .insert({
        template_id: newTemplateId,
        title: s.title,
        subtitle: s.subtitle,
        columns: s.columns,
        position: s.position,
      })
      .select("id")
      .single();
    if (insErr || !newSec) {
      return { error: insErr?.message ?? "Erro ao copiar seção." };
    }
    sectionIdMap.set(s.id, (newSec as { id: string }).id);
  }

  const { data: fields, error: fieldsErr } = await supabase
    .from("cl_form_fields")
    .select("*")
    .eq("template_id", sourceTemplateId)
    .order("position", { ascending: true });
  if (fieldsErr) return { error: fieldsErr.message };

  const fieldIdMap = new Map<string, string>();
  for (const f of (fields ?? []) as ClFormField[]) {
    const mappedSectionId = f.section_id
      ? (sectionIdMap.get(f.section_id) ?? null)
      : null;
    const { data: newField, error: fErr } = await supabase
      .from("cl_form_fields")
      .insert({
        template_id: newTemplateId,
        section_id: mappedSectionId,
        group_key: f.group_key,
        label: f.label,
        help_text: f.help_text,
        type: f.type,
        required: f.required,
        column_span: f.column_span,
        position: f.position,
        options: f.options,
      })
      .select("id")
      .single();
    if (fErr || !newField) {
      return { error: fErr?.message ?? "Erro ao copiar campo." };
    }
    fieldIdMap.set(f.id, (newField as { id: string }).id);
  }

  for (const f of (fields ?? []) as ClFormField[]) {
    if (!f.visible_when) continue;
    const newFieldId = fieldIdMap.get(f.id);
    const newTriggerId = fieldIdMap.get(f.visible_when.field_id);
    if (!newFieldId || !newTriggerId) continue;
    const updatedVisible: VisibleWhen = {
      field_id: newTriggerId,
      op: f.visible_when.op,
      value: f.visible_when.value,
    };
    const { error: updErr } = await supabase
      .from("cl_form_fields")
      .update({ visible_when: updatedVisible })
      .eq("id", newFieldId);
    if (updErr) return { error: updErr.message };
  }

  revalidatePath(`/projects/${targetProjectId}`);
  return { success: true, templateId: newTemplateId };
}
