"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface StepInput {
  id?: string;
  template_id: string;
  position: number;
  required: boolean;
}

export async function updateSequenceMeta(
  sequenceId: string,
  formData: FormData,
) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!name) return { error: "Nome é obrigatório." };

  const supabase = createClient();
  const { error } = await supabase
    .from("cl_checklist_sequences")
    .update({
      name,
      description: description || null,
    })
    .eq("id", sequenceId);

  if (error) return { error: error.message };

  revalidatePath(`/checklists/${sequenceId}`);
  return { success: true };
}

export async function saveSequenceSteps(
  sequenceId: string,
  steps: StepInput[],
) {
  const supabase = createClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("cl_checklist_steps")
    .select("id")
    .eq("sequence_id", sequenceId);

  if (fetchErr) return { error: fetchErr.message };

  const incomingIds = new Set(
    steps.map((s) => s.id).filter((v): v is string => Boolean(v)),
  );
  const toDelete =
    (existing as { id: string }[] | null)
      ?.filter((e) => !incomingIds.has(e.id))
      .map((e) => e.id) ?? [];

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("cl_checklist_steps")
      .delete()
      .in("id", toDelete);
    if (error) return { error: error.message };
  }

  for (const step of steps) {
    if (step.id) {
      const { error } = await supabase
        .from("cl_checklist_steps")
        .update({
          template_id: step.template_id,
          position: step.position,
          required: step.required,
        })
        .eq("id", step.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("cl_checklist_steps").insert({
        sequence_id: sequenceId,
        template_id: step.template_id,
        position: step.position,
        required: step.required,
      });
      if (error) return { error: error.message };
    }
  }

  revalidatePath(`/checklists/${sequenceId}`);
  return { success: true };
}

export async function deleteSequence(sequenceId: string, projectId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cl_checklist_sequences")
    .delete()
    .eq("id", sequenceId);

  if (error) return { error: error.message };

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/checklists`);
  redirect(`/projects/${projectId}`);
}
