"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type {
  ColumnSpan,
  FieldOptions,
  FieldType,
} from "@/lib/supabase/types";

import type { EditorField } from "./template-builder";

const TYPE_LABELS: Record<FieldType, string> = {
  text: "Texto curto",
  textarea: "Texto longo",
  number: "Número",
  date: "Data",
  checkbox: "Checkbox",
  select: "Seleção",
  radio: "Múltipla escolha",
  image: "Imagem",
};

interface Props {
  field: EditorField;
  onChange: (updater: (f: EditorField) => EditorField) => void;
  onDelete: () => void;
}

export function FieldEditor({ field, onChange, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.localId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const choices =
    (field.options as Exclude<FieldOptions, null>)?.choices ?? [];

  const needsChoices = field.type === "select" || field.type === "radio";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-background p-4 shadow-sm"
    >
      <div className="mb-3 flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px_140px]">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input
                value={field.label}
                onChange={(e) =>
                  onChange((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="Pergunta ou título do campo"
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={field.type}
                onValueChange={(value) =>
                  onChange((f) => ({
                    ...f,
                    type: value as FieldType,
                    options:
                      value === "select" || value === "radio"
                        ? f.options ?? { choices: [] }
                        : null,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Colunas</Label>
              <Select
                value={String(field.column_span)}
                onValueChange={(value) =>
                  onChange((f) => ({
                    ...f,
                    column_span: Number(value) as ColumnSpan,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 coluna</SelectItem>
                  <SelectItem value="2">2 colunas</SelectItem>
                  <SelectItem value="3">3 colunas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Texto de ajuda (opcional)</Label>
            <Input
              value={field.help_text ?? ""}
              onChange={(e) =>
                onChange((f) => ({
                  ...f,
                  help_text: e.target.value || null,
                }))
              }
              placeholder="Instrução auxiliar exibida abaixo do label"
            />
          </div>

          {needsChoices ? (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <Label>Opções</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    onChange((f) => {
                      const current =
                        (f.options as Exclude<FieldOptions, null>)?.choices ?? [];
                      const next = [
                        ...current,
                        {
                          label: `Opção ${current.length + 1}`,
                          value: `opt_${current.length + 1}`,
                        },
                      ];
                      return { ...f, options: { choices: next } };
                    })
                  }
                >
                  Adicionar opção
                </Button>
              </div>
              {choices.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Adicione pelo menos uma opção.
                </p>
              ) : (
                <div className="space-y-2">
                  {choices.map((choice, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={choice.label}
                        onChange={(e) =>
                          onChange((f) => {
                            const current =
                              (f.options as Exclude<FieldOptions, null>)
                                ?.choices ?? [];
                            const next = current.map((c, i) =>
                              i === idx
                                ? {
                                    label: e.target.value,
                                    value:
                                      e.target.value
                                        .toLowerCase()
                                        .replace(/\s+/g, "_")
                                        .replace(/[^a-z0-9_]/g, "") ||
                                      `opt_${i + 1}`,
                                  }
                                : c,
                            );
                            return { ...f, options: { choices: next } };
                          })
                        }
                        className="flex-1"
                        placeholder="Texto da opção"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          onChange((f) => {
                            const current =
                              (f.options as Exclude<FieldOptions, null>)
                                ?.choices ?? [];
                            return {
                              ...f,
                              options: {
                                choices: current.filter((_, i) => i !== idx),
                              },
                            };
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              id={`required-${field.localId}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                onChange((f) => ({ ...f, required: Boolean(checked) }))
              }
            />
            <Label
              htmlFor={`required-${field.localId}`}
              className="cursor-pointer"
            >
              Campo obrigatório
            </Label>
          </div>
        </div>

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
    </div>
  );
}
