"use client";

import { useEffect, useRef, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Asterisk,
  ChevronDown,
  ChevronRight,
  EyeOff,
  GripVertical,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import {
  TEMPLATE_ASSETS_BUCKET,
  getTemplateAssetPublicUrl,
} from "@/lib/storage/template-assets";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

import type {
  ColumnSpan,
  ConditionOp,
  FieldOptions,
  FieldType,
  SectionColumns,
} from "@/lib/supabase/types";

import type { EditorField, EditorSection } from "./template-builder";
import {
  FieldTypeIcon,
  RECOMMENDED_LABEL,
  SpanPicker,
  TYPE_META,
  TypePicker,
} from "./shared";

const OP_LABELS: Record<ConditionOp, string> = {
  truthy: "estiver marcado/preenchido",
  eq: "for igual a",
  includes: "incluir",
};

interface Props {
  field: EditorField;
  sections: EditorSection[];
  allFields: EditorField[];
  expanded: boolean;
  templateId: string;
  autoFocusLabel?: boolean;
  onToggle: () => void;
  onChange: (updater: (f: EditorField) => EditorField) => void;
  onDelete: () => void;
  onMoveToSection: (sectionLocalId: string) => void;
}

export function FieldAccordionItem({
  field,
  sections,
  allFields,
  expanded,
  templateId,
  autoFocusLabel,
  onToggle,
  onChange,
  onDelete,
  onMoveToSection,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.localId });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && autoFocusLabel) {
      requestAnimationFrame(() => labelInputRef.current?.focus());
    }
  }, [expanded, autoFocusLabel]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const meta = TYPE_META[field.type];
  const isInfo = field.type === "info";
  const isImage = field.type === "image";
  const isDisplayOnly = isInfo || isImage;
  const isHidden = Boolean(field.visible_when);
  const section = sections.find((s) => s.local_id === field.section_local_id);
  const maxSpan: SectionColumns = (section?.columns ?? 4) as SectionColumns;

  const opts = (field.options as Exclude<FieldOptions, null>) ?? {};
  const choices = opts.choices ?? [];
  const allowOther = opts.allow_other ?? false;
  const content = opts.content ?? "";
  const imageUrl = opts.image_url ?? null;
  const imageCaption = opts.image_caption ?? "";
  const imageLink = opts.image_link ?? "";
  const choicesCount = choices.length;

  const needsChoices =
    field.type === "select" ||
    field.type === "radio" ||
    field.type === "checkbox_group";

  const triggerCandidates = allFields.filter(
    (f) =>
      f.localId !== field.localId &&
      (f.type === "checkbox" ||
        f.type === "checkbox_group" ||
        f.type === "select" ||
        f.type === "radio"),
  );
  const conditionEnabled = Boolean(field.visible_when);

  const headerId = `field-head-${field.localId}`;
  const bodyId = `field-body-${field.localId}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-md border bg-background transition-colors",
        expanded
          ? "border-foreground shadow-sm"
          : "border-border hover:bg-muted/40",
      )}
    >
      <div
        id={headerId}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="group flex cursor-pointer items-center gap-2 px-2 py-1.5"
      >
        <button
          type="button"
          className="cursor-grab text-muted-foreground/50 hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
          aria-label="Arrastar campo"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-foreground">
          <FieldTypeIcon type={field.type} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-sm",
                field.label ? "font-medium" : "italic text-muted-foreground",
              )}
            >
              {field.label || "(sem label)"}
            </span>
            {field.required && !isDisplayOnly ? (
              <Asterisk
                className="h-3 w-3 text-destructive-foreground"
                aria-label="Obrigatório"
              />
            ) : null}
            {isHidden ? (
              <EyeOff
                className="h-3 w-3 text-muted-foreground"
                aria-label="Condicional"
              />
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{meta.short}</span>
            {!isInfo ? (
              <>
                <span>·</span>
                <span>
                  {field.column_span} col
                  {field.column_span > 1 ? "s" : ""}
                </span>
              </>
            ) : null}
            {isImage && !imageUrl ? (
              <>
                <span>·</span>
                <span className="text-destructive-foreground">sem imagem</span>
              </>
            ) : null}
            {needsChoices && choicesCount === 0 ? (
              <>
                <span>·</span>
                <span className="text-destructive-foreground">
                  sem opções
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-destructive-foreground group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Excluir"
            aria-label="Excluir campo"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <div className="flex h-7 w-7 items-center justify-center text-muted-foreground">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>

      {expanded ? (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={headerId}
          className="space-y-4 border-t bg-muted/20 px-3 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-1.5">
            <Label className="text-xs">
              {isDisplayOnly ? "Título (opcional)" : "Pergunta / Label"}
            </Label>
            <Input
              ref={labelInputRef}
              value={field.label}
              onChange={(e) =>
                onChange((f) => ({ ...f, label: e.target.value }))
              }
              placeholder={
                isInfo
                  ? "Ex.: Observações"
                  : isImage
                  ? "Ex.: Planta baixa"
                  : "Ex.: Tamanho do ambiente"
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de campo</Label>
            <TypePicker
              value={field.type}
              onChange={(nextType) =>
                onChange((f) => {
                  const keepChoices =
                    nextType === "select" ||
                    nextType === "radio" ||
                    nextType === "checkbox_group";
                  const prevOpts =
                    (f.options as Exclude<FieldOptions, null>) ?? {};
                  return {
                    ...f,
                    type: nextType,
                    required:
                      nextType === "info" || nextType === "image"
                        ? false
                        : f.required,
                    options: keepChoices
                      ? {
                          choices: prevOpts.choices ?? [],
                          allow_other:
                            nextType === "checkbox_group"
                              ? prevOpts.allow_other ?? false
                              : undefined,
                        }
                      : nextType === "info"
                      ? { content: prevOpts.content ?? "" }
                      : nextType === "image"
                      ? {
                          image_url: prevOpts.image_url ?? null,
                          image_caption: prevOpts.image_caption ?? null,
                          image_link: prevOpts.image_link ?? null,
                        }
                      : null,
                  };
                })
              }
            />
          </div>

          {isInfo ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Conteúdo</Label>
              <Textarea
                value={content}
                onChange={(e) =>
                  onChange((f) => ({
                    ...f,
                    options: { content: e.target.value },
                  }))
                }
                placeholder="Texto informativo (use - para bullets)"
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                Linhas começando com &quot;- &quot; viram lista.
              </p>
            </div>
          ) : null}

          {isImage ? (
            <ImageEditor
              templateId={templateId}
              fieldLocalId={field.localId}
              imageUrl={imageUrl}
              caption={imageCaption}
              link={imageLink}
              onChangeImageUrl={(url) =>
                onChange((f) => ({
                  ...f,
                  options: {
                    ...((f.options as Exclude<FieldOptions, null>) ?? {}),
                    image_url: url,
                  },
                }))
              }
              onChangeCaption={(value) =>
                onChange((f) => ({
                  ...f,
                  options: {
                    ...((f.options as Exclude<FieldOptions, null>) ?? {}),
                    image_caption: value || null,
                  },
                }))
              }
              onChangeLink={(value) =>
                onChange((f) => ({
                  ...f,
                  options: {
                    ...((f.options as Exclude<FieldOptions, null>) ?? {}),
                    image_link: value || null,
                  },
                }))
              }
            />
          ) : null}

          {needsChoices ? (
            <ChoicesEditor
              choices={choices}
              allowOther={allowOther}
              showAllowOther={field.type === "checkbox_group"}
              onAdd={() =>
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
                  return {
                    ...f,
                    options: {
                      ...(f.options as Exclude<FieldOptions, null>),
                      choices: next,
                    },
                  };
                })
              }
              onChangeLabel={(idx, label) =>
                onChange((f) => {
                  const current =
                    (f.options as Exclude<FieldOptions, null>)?.choices ?? [];
                  const next = current.map((c, i) =>
                    i === idx
                      ? {
                          ...c,
                          label,
                          value:
                            label
                              .toLowerCase()
                              .replace(/\s+/g, "_")
                              .replace(/[^a-z0-9_]/g, "") || `opt_${i + 1}`,
                        }
                      : c,
                  );
                  return {
                    ...f,
                    options: {
                      ...(f.options as Exclude<FieldOptions, null>),
                      choices: next,
                    },
                  };
                })
              }
              onToggleRecommended={(idx, checked) =>
                onChange((f) => {
                  const current =
                    (f.options as Exclude<FieldOptions, null>)?.choices ?? [];
                  const next = current.map((c, i) =>
                    i === idx ? { ...c, recommended: checked } : c,
                  );
                  return {
                    ...f,
                    options: {
                      ...(f.options as Exclude<FieldOptions, null>),
                      choices: next,
                    },
                  };
                })
              }
              onRemove={(idx) =>
                onChange((f) => {
                  const current =
                    (f.options as Exclude<FieldOptions, null>)?.choices ?? [];
                  return {
                    ...f,
                    options: {
                      ...(f.options as Exclude<FieldOptions, null>),
                      choices: current.filter((_, i) => i !== idx),
                    },
                  };
                })
              }
              onToggleAllowOther={(checked) =>
                onChange((f) => ({
                  ...f,
                  options: {
                    ...(f.options as Exclude<FieldOptions, null>),
                    allow_other: checked,
                  },
                }))
              }
            />
          ) : null}

          {field.type === "checkbox" ? (
            <RecommendedValueEditor
              value={opts.recommended_value ?? null}
              onChange={(next) =>
                onChange((f) => ({
                  ...f,
                  options: {
                    ...((f.options as Exclude<FieldOptions, null>) ?? {}),
                    recommended_value: next,
                  },
                }))
              }
            />
          ) : null}

          {!isInfo ? (
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <div className="space-y-1.5">
                <Label className="text-xs">Largura</Label>
                <SpanPicker
                  value={field.column_span}
                  max={maxSpan}
                  onChange={(v) =>
                    onChange((f) => ({ ...f, column_span: v as ColumnSpan }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Seção</Label>
                <Select
                  value={field.section_local_id ?? ""}
                  onValueChange={(value) => onMoveToSection(value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seção" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.local_id} value={s.local_id}>
                        {s.title || "(sem título)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {!isDisplayOnly ? (
            <label className="flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Checkbox
                checked={field.required}
                onCheckedChange={(checked) =>
                  onChange((f) => ({ ...f, required: Boolean(checked) }))
                }
              />
              <span className="text-sm">Campo obrigatório</span>
            </label>
          ) : null}

          {!isDisplayOnly ? (
            <div className="rounded-md border bg-background">
              <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium",
                  advancedOpen ? "border-b" : "",
                )}
                aria-expanded={advancedOpen}
              >
                <span>Avançado</span>
                {advancedOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              {advancedOpen ? (
                <div className="space-y-3 px-3 py-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Texto de ajuda</Label>
                    <Input
                      value={field.help_text ?? ""}
                      onChange={(e) =>
                        onChange((f) => ({
                          ...f,
                          help_text: e.target.value || null,
                        }))
                      }
                      placeholder="Instrução auxiliar (opcional)"
                    />
                  </div>

                  <div className="space-y-2 rounded-md border border-dashed p-2.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <Checkbox
                        checked={conditionEnabled}
                        onCheckedChange={(checked) =>
                          onChange((f) => ({
                            ...f,
                            visible_when: checked
                              ? {
                                  field_id:
                                    triggerCandidates[0]?.localId ?? "",
                                  op: "truthy",
                                  value: "",
                                }
                              : null,
                          }))
                        }
                      />
                      <span className="text-sm">Exibir apenas se…</span>
                    </label>
                    {conditionEnabled && field.visible_when ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Select
                          value={field.visible_when.field_id}
                          onValueChange={(value) =>
                            onChange((f) => ({
                              ...f,
                              visible_when: f.visible_when
                                ? { ...f.visible_when, field_id: value }
                                : null,
                            }))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Campo" />
                          </SelectTrigger>
                          <SelectContent>
                            {triggerCandidates.length === 0 ? (
                              <SelectItem value="__empty" disabled>
                                Nenhum campo candidato
                              </SelectItem>
                            ) : (
                              triggerCandidates.map((f) => (
                                <SelectItem key={f.localId} value={f.localId}>
                                  {f.label || "(sem label)"}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <Select
                          value={field.visible_when.op}
                          onValueChange={(value) =>
                            onChange((f) => ({
                              ...f,
                              visible_when: f.visible_when
                                ? {
                                    ...f.visible_when,
                                    op: value as ConditionOp,
                                  }
                                : null,
                            }))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OP_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {field.visible_when.op !== "truthy" ? (
                          <Input
                            className="sm:col-span-2"
                            value={field.visible_when.value ?? ""}
                            onChange={(e) =>
                              onChange((f) => ({
                                ...f,
                                visible_when: f.visible_when
                                  ? {
                                      ...f.visible_when,
                                      value: e.target.value,
                                    }
                                  : null,
                              }))
                            }
                            placeholder="Valor"
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChoicesEditor({
  choices,
  allowOther,
  showAllowOther,
  onAdd,
  onChangeLabel,
  onToggleRecommended,
  onRemove,
  onToggleAllowOther,
}: {
  choices: { label: string; value: string; recommended?: boolean }[];
  allowOther: boolean;
  showAllowOther: boolean;
  onAdd: () => void;
  onChangeLabel: (idx: number, label: string) => void;
  onToggleRecommended: (idx: number, checked: boolean) => void;
  onRemove: (idx: number) => void;
  onToggleAllowOther: (checked: boolean) => void;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Opções</Label>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-1 h-3 w-3" />
          Adicionar
        </Button>
      </div>
      {choices.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Adicione pelo menos uma opção.
        </p>
      ) : (
        <div className="space-y-1.5">
          {choices.map((choice, idx) => {
            const isRecommended = Boolean(choice.recommended);
            return (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={choice.label}
                  onChange={(e) => onChangeLabel(idx, e.target.value)}
                  className="h-8 flex-1"
                  placeholder="Texto da opção"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8",
                    isRecommended
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-muted-foreground",
                  )}
                  onClick={() => onToggleRecommended(idx, !isRecommended)}
                  title={
                    isRecommended
                      ? `Remover recomendação (${RECOMMENDED_LABEL})`
                      : `Marcar como recomendado (${RECOMMENDED_LABEL})`
                  }
                  aria-pressed={isRecommended}
                  aria-label={
                    isRecommended
                      ? "Remover recomendação StudioBIM"
                      : "Marcar como recomendado pela StudioBIM"
                  }
                >
                  <Star
                    className={cn(
                      "h-3.5 w-3.5",
                      isRecommended && "fill-amber-400 text-amber-500",
                    )}
                  />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => onRemove(idx)}
                  aria-label="Remover opção"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {showAllowOther ? (
        <label className="flex cursor-pointer items-center gap-2 pt-1">
          <Checkbox
            checked={allowOther}
            onCheckedChange={(checked) =>
              onToggleAllowOther(Boolean(checked))
            }
          />
          <span className="text-sm">
            Incluir opção &quot;Outra&quot; com texto livre
          </span>
        </label>
      ) : null}
      <p className="flex items-center gap-1 pt-1 text-[11px] text-muted-foreground">
        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
        Marque as opções preferenciais pela StudioBIM.
      </p>
    </div>
  );
}

function RecommendedValueEditor({
  value,
  onChange,
}: {
  value: "true" | "false" | null;
  onChange: (next: "true" | "false" | null) => void;
}) {
  const options: { key: "none" | "true" | "false"; label: string }[] = [
    { key: "none", label: "Sem recomendação" },
    { key: "true", label: "Sim" },
    { key: "false", label: "Não" },
  ];
  const current: "none" | "true" | "false" = value ?? "none";

  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <Label className="text-xs">Recomendação StudioBIM</Label>
      <div className="inline-flex rounded-md border bg-background p-0.5">
        {options.map((opt) => {
          const active = current === opt.key;
          const showStar = opt.key !== "none";
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() =>
                onChange(opt.key === "none" ? null : opt.key)
              }
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={active}
            >
              {showStar ? (
                <Star
                  className={cn(
                    "h-3 w-3",
                    active
                      ? "fill-amber-300 text-amber-300"
                      : "fill-amber-400 text-amber-500",
                  )}
                />
              ) : null}
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Indica qual resposta é preferida pela StudioBIM.
      </p>
    </div>
  );
}

function ImageEditor({
  templateId,
  fieldLocalId,
  imageUrl,
  caption,
  link,
  onChangeImageUrl,
  onChangeCaption,
  onChangeLink,
}: {
  templateId: string;
  fieldLocalId: string;
  imageUrl: string | null;
  caption: string;
  link: string;
  onChangeImageUrl: (url: string | null) => void;
  onChangeCaption: (value: string) => void;
  onChangeLink: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const publicUrl = getTemplateAssetPublicUrl(imageUrl);

  async function handleUpload(file: File) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${templateId}/${fieldLocalId}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(TEMPLATE_ASSETS_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    setUploading(false);

    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      return;
    }

    if (imageUrl && imageUrl !== path) {
      await supabase.storage.from(TEMPLATE_ASSETS_BUCKET).remove([imageUrl]);
    }

    onChangeImageUrl(path);
    toast.success("Imagem enviada. Salve o formulário para confirmar.");
  }

  async function handleRemove() {
    if (!imageUrl) return;
    const supabase = createClient();
    await supabase.storage.from(TEMPLATE_ASSETS_BUCKET).remove([imageUrl]);
    onChangeImageUrl(null);
  }

  return (
    <div className="space-y-3 rounded-md border bg-background p-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Imagem</Label>
        {publicUrl ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="relative overflow-hidden rounded-md border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl}
                alt={caption || "Imagem do formulário"}
                className="h-28 w-40 object-cover"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Trocar
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={uploading}
                className="text-destructive-foreground"
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/40 text-xs text-muted-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Upload className="h-5 w-5" />
                Clique para enviar uma imagem
              </>
            )}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Legenda (opcional)</Label>
        <Input
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          placeholder="Ex.: Vista frontal do bloco A"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Link ao clicar (opcional)</Label>
        <Input
          value={link}
          onChange={(e) => onChangeLink(e.target.value)}
          placeholder="https://…"
          type="url"
        />
        <p className="text-[11px] text-muted-foreground">
          Se preenchido, clicar na imagem abre este link em uma nova aba. Se
          vazio, clicar abre a imagem em tamanho original.
        </p>
      </div>
    </div>
  );
}
