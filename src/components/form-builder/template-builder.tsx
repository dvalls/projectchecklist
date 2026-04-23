"use client";

import { useState, useTransition } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import type {
  ClFormField,
  ClFormTemplate,
  ColumnSpan,
  FieldOptions,
  FieldType,
} from "@/lib/supabase/types";

import {
  saveTemplateFields,
  updateTemplateMeta,
  type FieldInput,
} from "@/app/(dashboard)/templates/[id]/actions";

import { FieldEditor } from "./field-editor";
import { FieldPreview } from "./field-preview";

export interface EditorField {
  localId: string;
  id?: string;
  label: string;
  help_text: string | null;
  type: FieldType;
  required: boolean;
  column_span: ColumnSpan;
  options: FieldOptions;
}

function toEditor(field: ClFormField): EditorField {
  return {
    localId: field.id,
    id: field.id,
    label: field.label,
    help_text: field.help_text,
    type: field.type,
    required: field.required,
    column_span: field.column_span,
    options: field.options,
  };
}

function newLocalId() {
  return `new_${Math.random().toString(36).slice(2, 10)}`;
}

export function TemplateBuilder({
  template,
  initialFields,
}: {
  template: ClFormTemplate;
  initialFields: ClFormField[];
}) {
  const [fields, setFields] = useState<EditorField[]>(
    initialFields.map(toEditor),
  );
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description ?? "");
  const [isSaving, startSaving] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function addField() {
    setFields((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        label: "Novo campo",
        help_text: null,
        type: "text",
        required: false,
        column_span: 1,
        options: null,
      },
    ]);
  }

  function updateField(
    localId: string,
    updater: (f: EditorField) => EditorField,
  ) {
    setFields((prev) =>
      prev.map((f) => (f.localId === localId ? updater(f) : f)),
    );
  }

  function deleteField(localId: string) {
    setFields((prev) => prev.filter((f) => f.localId !== localId));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setFields((prev) => {
      const oldIndex = prev.findIndex((f) => f.localId === active.id);
      const newIndex = prev.findIndex((f) => f.localId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function handleSave() {
    startSaving(async () => {
      const metaForm = new FormData();
      metaForm.set("name", name);
      metaForm.set("description", description);
      const metaRes = await updateTemplateMeta(template.id, metaForm);
      if (metaRes?.error) {
        toast.error(metaRes.error);
        return;
      }

      const payload: FieldInput[] = fields.map((f, idx) => ({
        id: f.id,
        label: f.label,
        help_text: f.help_text,
        type: f.type,
        required: f.required,
        column_span: f.column_span,
        position: idx,
        options: f.options,
      }));

      const res = await saveTemplateFields(template.id, payload);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Formulário salvo.");
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
            placeholder="Nome do formulário"
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

      <Separator />

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              Campos ({fields.length})
            </Label>
            <Button size="sm" variant="outline" onClick={addField}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adicionar campo
            </Button>
          </div>

          {fields.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nenhum campo ainda. Clique em &quot;Adicionar campo&quot; para
              começar.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fields.map((f) => f.localId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {fields.map((field) => (
                    <FieldEditor
                      key={field.localId}
                      field={field}
                      onChange={(updater) => updateField(field.localId, updater)}
                      onDelete={() => deleteField(field.localId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Label className="text-sm text-muted-foreground">Preview</Label>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {name || "(sem título)"}
              </CardTitle>
              {description ? (
                <CardDescription>{description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Adicione campos para visualizar o formulário aqui.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {fields.map((f) => {
                    const previewField: ClFormField = {
                      id: f.localId,
                      template_id: template.id,
                      label: f.label,
                      help_text: f.help_text,
                      type: f.type,
                      required: f.required,
                      column_span: f.column_span,
                      position: 0,
                      options: f.options,
                      created_at: new Date().toISOString(),
                    };
                    return (
                      <div
                        key={f.localId}
                        style={{ gridColumn: `span ${f.column_span}` }}
                      >
                        <FieldPreview field={previewField} />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
