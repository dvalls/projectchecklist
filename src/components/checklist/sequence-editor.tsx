"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type {
  ClChecklistSequence,
  ClChecklistStep,
  ClFormTemplate,
} from "@/lib/supabase/types";

import {
  saveSequenceSteps,
  updateSequenceMeta,
  type StepInput,
} from "@/app/(dashboard)/checklists/[id]/actions";

interface EditorStep {
  localId: string;
  id?: string;
  template_id: string;
  required: boolean;
}

function newLocalId() {
  return `new_${Math.random().toString(36).slice(2, 10)}`;
}

export function SequenceEditor({
  sequence,
  initialSteps,
  availableTemplates,
  submittedTemplateIds,
}: {
  sequence: ClChecklistSequence;
  initialSteps: ClChecklistStep[];
  availableTemplates: ClFormTemplate[];
  submittedTemplateIds: string[];
}) {
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description ?? "");
  const [steps, setSteps] = useState<EditorStep[]>(
    initialSteps.map((s) => ({
      localId: s.id,
      id: s.id,
      template_id: s.template_id,
      required: s.required,
    })),
  );
  const [isSaving, startSaving] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const templateMap = useMemo(() => {
    const m = new Map<string, ClFormTemplate>();
    availableTemplates.forEach((t) => m.set(t.id, t));
    return m;
  }, [availableTemplates]);

  const submittedSet = useMemo(
    () => new Set(submittedTemplateIds),
    [submittedTemplateIds],
  );

  const completed = steps.filter((s) => submittedSet.has(s.template_id)).length;
  const total = steps.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  function addStep() {
    const firstTemplate = availableTemplates[0];
    if (!firstTemplate) {
      toast.error("Crie um formulário antes de adicionar etapas.");
      return;
    }
    setSteps((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        template_id: firstTemplate.id,
        required: true,
      },
    ]);
  }

  function updateStep(
    localId: string,
    updater: (s: EditorStep) => EditorStep,
  ) {
    setSteps((prev) =>
      prev.map((s) => (s.localId === localId ? updater(s) : s)),
    );
  }

  function deleteStep(localId: string) {
    setSteps((prev) => prev.filter((s) => s.localId !== localId));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const oldIndex = prev.findIndex((s) => s.localId === active.id);
      const newIndex = prev.findIndex((s) => s.localId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSave() {
    startSaving(async () => {
      const metaForm = new FormData();
      metaForm.set("name", name);
      metaForm.set("description", description);
      const metaRes = await updateSequenceMeta(sequence.id, metaForm);
      if (metaRes?.error) {
        toast.error(metaRes.error);
        return;
      }

      const payload: StepInput[] = steps.map((s, idx) => ({
        id: s.id,
        template_id: s.template_id,
        position: idx,
        required: s.required,
      }));

      const res = await saveSequenceSteps(sequence.id, payload);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Checklist salvo.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
            placeholder="Nome do checklist"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            rows={2}
            placeholder="Descrição (opcional)"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Progresso</span>
          <span className="text-muted-foreground">
            {completed} de {total} etapas
          </span>
        </div>
        <Progress value={percent} />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            Etapas ({steps.length})
          </Label>
          <Button size="sm" variant="outline" onClick={addStep}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Adicionar etapa
          </Button>
        </div>

        {steps.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhuma etapa ainda. Adicione formulários ao checklist.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((s) => s.localId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <StepRow
                    key={step.localId}
                    step={step}
                    index={idx}
                    template={templateMap.get(step.template_id)}
                    availableTemplates={availableTemplates}
                    submitted={submittedSet.has(step.template_id)}
                    sequenceId={sequence.id}
                    onChange={(updater) => updateStep(step.localId, updater)}
                    onDelete={() => deleteStep(step.localId)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function StepRow({
  step,
  index,
  template,
  availableTemplates,
  submitted,
  sequenceId,
  onChange,
  onDelete,
}: {
  step: EditorStep;
  index: number;
  template: ClFormTemplate | undefined;
  availableTemplates: ClFormTemplate[];
  submitted: boolean;
  sequenceId: string;
  onChange: (updater: (s: EditorStep) => EditorStep) => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm"
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
        {index + 1}
      </div>

      <div className="min-w-0 flex-1">
        <Select
          value={step.template_id}
          onValueChange={(value) =>
            onChange((s) => ({ ...s, template_id: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTemplates.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`req-${step.localId}`}
          checked={step.required}
          onCheckedChange={(checked) =>
            onChange((s) => ({ ...s, required: Boolean(checked) }))
          }
        />
        <Label htmlFor={`req-${step.localId}`} className="cursor-pointer">
          Obrigatório
        </Label>
      </div>

      {submitted ? (
        <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">
          Concluído
        </Badge>
      ) : (
        <Badge variant="outline">Pendente</Badge>
      )}

      {template && step.id ? (
        <Button variant="ghost" size="icon" asChild>
          <Link
            href={`/submissions/new?template=${template.id}&sequence=${sequenceId}&step=${step.id}`}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      ) : null}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive-foreground"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
