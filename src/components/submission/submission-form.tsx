"use client";

import { useMemo, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { ImageDisplayField } from "@/components/form-builder/field-preview";
import { PhotoHintButton } from "@/components/form-builder/photo-hint-button";
import { ChoiceLabel, RecommendedBadge } from "@/components/form-builder/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import type {
  ClFormField,
  ClFormSection,
  ClFormTemplate,
  FieldOptions,
} from "@/lib/supabase/types";

import {
  type CheckboxGroupValue,
  type FieldValue,
  type SubmissionMatrixValueInput,
  type SubmissionValueInput,
} from "@/lib/forms/types";
import {
  evaluateVisible,
  isDisplayOnly,
  makeFieldKey,
  parseCheckboxGroup,
  serializeCheckboxGroup,
} from "@/lib/forms/utils";

import { createSubmission } from "@/app/(dashboard)/submissions/actions";

interface Props {
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
}

export function SubmissionForm({ template, sections, fields }: Props) {
  const isMatrix = template.layout_mode === "matrix";
  const environments = useMemo(
    () => (template.environments ?? []) as string[],
    [template.environments],
  );

  const envScope = useMemo(
    () => (isMatrix ? environments : [undefined as string | undefined]),
    [isMatrix, environments],
  );

  const initialValues = useMemo<Record<string, FieldValue>>(() => {
    const out: Record<string, FieldValue> = {};
    for (const f of fields) {
      if (isDisplayOnly(f.type)) continue;
      for (const env of envScope) {
        out[makeFieldKey(f.id, env)] = {
          value: f.type === "checkbox" ? "false" : null,
        };
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, isMatrix]);

  const [values, setValues] = useState<Record<string, FieldValue>>(initialValues);
  const [isSubmitting, startSubmitting] = useTransition();

  function setFieldValue(key: string, patch: Partial<FieldValue>) {
    setValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function handleSubmit(asDraft: boolean) {
    if (!template.project_id) {
      toast.error(
        "Templates da biblioteca não podem ser respondidos. Importe-o em um projeto primeiro.",
      );
      return;
    }
    const projectId = template.project_id;
    const inputs: SubmissionValueInput[] = [];
    const matrixInputs: SubmissionMatrixValueInput[] = [];

    for (const env of envScope) {
      for (const f of fields) {
        if (isDisplayOnly(f.type)) continue;
        const key = makeFieldKey(f.id, env);
        const v = values[key];
        const visible = evaluateVisible(f.visible_when, values, env);

        if (f.required && visible && !asDraft) {
          const missing =
            f.type === "checkbox"
              ? v?.value !== "true"
              : f.type === "checkbox_group"
                ? (() => {
                    const parsed = parseCheckboxGroup(v?.value ?? null);
                    return parsed.selected.length === 0 && !parsed.other;
                  })()
                : !v?.value;
          if (missing) {
            toast.error(`${f.label}${env ? ` (${env})` : ""}: obrigatório.`);
            return;
          }
        }

        if (!visible) continue;

        const payload = {
          field_id: f.id,
          value: v?.value ?? null,
          image_url: null,
        };

        if (env) {
          matrixInputs.push({ ...payload, env_key: env });
        } else {
          inputs.push(payload);
        }
      }
    }

    startSubmitting(async () => {
      const res = await createSubmission({
        template_id: template.id,
        project_id: projectId,
        values: inputs,
        matrix_values: matrixInputs,
        asDraft,
      });

      if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">{template.name}</CardTitle>
        {template.description ? (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-8 p-4 pt-0 sm:p-6 sm:pt-0">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este formulário não possui campos.
          </p>
        ) : isMatrix ? (
          <MatrixRenderer
            sections={sections}
            fields={fields}
            environments={environments}
            values={values}
            onChange={setFieldValue}
          />
        ) : (
          <StandardRenderer
            sections={sections}
            fields={fields}
            values={values}
            onChange={setFieldValue}
          />
        )}

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Salvar rascunho
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StandardRenderer({
  sections,
  fields,
  values,
  onChange,
}: {
  sections: ClFormSection[];
  fields: ClFormField[];
  values: Record<string, FieldValue>;
  onChange: (key: string, patch: Partial<FieldValue>) => void;
}) {
  const sectionList =
    sections.length > 0
      ? sections
      : [
          {
            id: "_default",
            template_id: "",
            title: "",
            subtitle: null,
            columns: 3,
            position: 0,
            created_at: "",
          } satisfies ClFormSection,
        ];

  return (
    <div className="space-y-8">
      {sectionList.map((section) => {
        const sectionFields =
          sections.length > 0
            ? fields.filter((f) => f.section_id === section.id)
            : fields;
        if (sectionFields.length === 0) return null;
        return (
          <section key={section.id} className="space-y-3">
            {section.title ? (
              <div className="border-b pb-1">
                <div className="inline-block bg-foreground px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-background">
                  {section.title}
                </div>
                {section.subtitle ? (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {section.subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div
              className="grid grid-cols-1 gap-4 sm:[grid-template-columns:var(--section-columns)]"
              style={
                {
                  "--section-columns": `repeat(${section.columns}, minmax(0, 1fr))`,
                } as React.CSSProperties
              }
            >
              {sectionFields.map((field) => {
                const key = makeFieldKey(field.id);
                const visible = evaluateVisible(field.visible_when, values);
                if (!visible) return null;
                return (
                  <div
                    key={field.id}
                    className="min-w-0 sm:[grid-column:var(--field-span)]"
                    style={
                      {
                        "--field-span": `span ${Math.min(
                          field.column_span,
                          section.columns,
                        )}`,
                      } as React.CSSProperties
                    }
                  >
                    <FieldInput
                      field={field}
                      value={values[key]}
                      onChange={(patch) => onChange(key, patch)}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function MatrixRenderer({
  sections,
  fields,
  environments,
  values,
  onChange,
}: {
  sections: ClFormSection[];
  fields: ClFormField[];
  environments: string[];
  values: Record<string, FieldValue>;
  onChange: (key: string, patch: Partial<FieldValue>) => void;
}) {
  const rows = fields.filter((f) => !isDisplayOnly(f.type));

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const secRows = rows.filter((f) => f.section_id === section.id);
        if (secRows.length === 0) return null;
        return (
          <div key={section.id} className="space-y-2">
            {section.title ? (
              <div className="inline-block bg-foreground px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-background">
                {section.title}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-[200px] bg-background p-2 text-left text-xs italic text-muted-foreground">
                      Ambiente
                    </th>
                    {environments.map((env) => (
                      <th
                        key={env}
                        className="border-l p-2 text-left text-xs font-semibold uppercase tracking-wide"
                      >
                        {env}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {secRows.map((field) => {
                    const fieldOpts =
                      (field.options as Exclude<FieldOptions, null>) ?? {};
                    const fieldImage = fieldOpts.image_url ?? null;
                    return (
                      <tr key={field.id} className="align-top">
                        <td className="sticky left-0 z-10 w-[200px] bg-background p-2 text-sm">
                          <div className="flex flex-wrap items-center gap-1.5 font-medium">
                            <span>{field.label}</span>
                            {field.required ? (
                              <span className="text-destructive-foreground">*</span>
                            ) : null}
                            {fieldImage ? (
                              <PhotoHintButton
                                imagePath={fieldImage}
                                caption={fieldOpts.image_caption ?? null}
                                alt={field.label}
                                size="xs"
                              />
                            ) : null}
                          </div>
                          {field.help_text ? (
                            <div className="text-xs italic text-muted-foreground">
                              {field.help_text}
                            </div>
                          ) : null}
                        </td>
                        {environments.map((env) => {
                          const key = makeFieldKey(field.id, env);
                          const visible = evaluateVisible(
                            field.visible_when,
                            values,
                            env,
                          );
                          return (
                            <td key={env} className="border-l border-t p-2 align-top">
                              {visible ? (
                                <FieldInput
                                  field={field}
                                  value={values[key]}
                                  compact
                                  onChange={(patch) => onChange(key, patch)}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoFieldView({ field }: { field: ClFormField }) {
  const opts = (field.options as Exclude<FieldOptions, null>) ?? {};
  const content = opts.content ?? field.help_text ?? "";
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const isAllBullets = lines.length > 0 && lines.every((l) => l.trim().startsWith("- "));

  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-3">
      {field.label ? (
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {field.label}
        </div>
      ) : null}
      {isAllBullets ? (
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {lines.map((l, i) => (
            <li key={i}>{l.replace(/^-\s*/, "")}</li>
          ))}
        </ul>
      ) : (
        <p className="whitespace-pre-wrap text-xs italic text-muted-foreground">
          {content}
        </p>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  compact,
  onChange,
}: {
  field: ClFormField;
  value: FieldValue | undefined;
  compact?: boolean;
  onChange: (patch: Partial<FieldValue>) => void;
}) {
  const opts = (field.options as Exclude<FieldOptions, null>) ?? {};
  const choices = opts.choices ?? [];

  if (field.type === "info") {
    return <InfoFieldView field={field} />;
  }

  if (field.type === "image") {
    return (
      <ImageDisplayField
        label={field.label}
        imageUrl={opts.image_url ?? null}
        caption={opts.image_caption ?? null}
        link={opts.image_link ?? null}
      />
    );
  }

  const showLabel = !compact && field.type !== "checkbox";
  const groupValue =
    field.type === "checkbox_group" ? parseCheckboxGroup(value?.value ?? null) : null;

  function updateGroup(next: CheckboxGroupValue) {
    onChange({ value: serializeCheckboxGroup(next) });
  }

  const fieldPhoto = opts.image_url ?? null;
  const fieldPhotoButton = fieldPhoto ? (
    <PhotoHintButton
      imagePath={fieldPhoto}
      caption={opts.image_caption ?? null}
      alt={field.label}
      size="sm"
    />
  ) : null;

  return (
    <div className="space-y-1.5">
      {showLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label>
            {field.label}
            {field.required ? (
              <span className="ml-1 text-destructive-foreground">*</span>
            ) : null}
          </Label>
          {fieldPhotoButton}
        </div>
      ) : null}
      {showLabel && field.help_text ? (
        <p className="text-xs italic text-muted-foreground">{field.help_text}</p>
      ) : null}

      {field.type === "text" ? (
        <Input
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "number" ? (
        <Input
          type="number"
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          rows={compact ? 2 : 3}
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "date" ? (
        <Input
          type="date"
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "checkbox" ? (
        <div className="space-y-1 pt-1">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={value?.value === "true"}
              onCheckedChange={(checked) =>
                onChange({ value: checked ? "true" : "false" })
              }
            />
            <span className="text-sm">
              {compact ? "Sim" : field.label}
              {!compact && field.required ? (
                <span className="ml-1 text-destructive-foreground">*</span>
              ) : null}
            </span>
            {!compact ? fieldPhotoButton : null}
            {opts.recommended_value ? <RecommendedBadge /> : null}
          </label>
          {!compact && field.help_text ? (
            <p className="pl-6 text-xs italic text-muted-foreground">{field.help_text}</p>
          ) : null}
          {opts.recommended_value && !compact ? (
            <p className="pl-6 text-[11px] text-warning-foreground">
              StudioBIM recomenda:{" "}
              <strong>{opts.recommended_value === "true" ? "Sim" : "Não"}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {field.type === "checkbox_group" && groupValue ? (
        <div className="space-y-1.5 pt-1">
          {choices.map((c) => {
            const checked = groupValue.selected.includes(c.value);
            return (
              <label
                key={c.value}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => {
                    const nextSelected = v
                      ? [...groupValue.selected, c.value]
                      : groupValue.selected.filter((s) => s !== c.value);
                    updateGroup({ ...groupValue, selected: nextSelected });
                  }}
                />
                <ChoiceLabel label={c.label} recommended={c.recommended} />
                {c.image_url ? (
                  <PhotoHintButton
                    imagePath={c.image_url}
                    caption={c.image_caption ?? null}
                    alt={c.label}
                    size="xs"
                  />
                ) : null}
              </label>
            );
          })}
          {opts.allow_other ? (
            <div className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={groupValue.other !== undefined}
                onCheckedChange={(v) =>
                  updateGroup({
                    ...groupValue,
                    other: v ? (groupValue.other ?? "") : undefined,
                  })
                }
              />
              <span>Outra:</span>
              <Input
                className="h-8 flex-1"
                value={groupValue.other ?? ""}
                disabled={groupValue.other === undefined}
                onChange={(e) => updateGroup({ ...groupValue, other: e.target.value })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {field.type === "select" ? (
        <div className="space-y-1.5">
          <Select
            value={value?.value ?? ""}
            onValueChange={(v) => onChange({ value: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {choices.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <ChoiceLabel label={c.label} recommended={c.recommended} />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(() => {
            const selected = choices.find((c) => c.value === value?.value);
            if (selected?.image_url) {
              return (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <PhotoHintButton
                    imagePath={selected.image_url}
                    caption={selected.image_caption ?? null}
                    alt={selected.label}
                    size="sm"
                  />
                  <span>Foto da opção selecionada</span>
                </div>
              );
            }
            const withPhotos = choices.filter((c) => c.image_url);
            if (withPhotos.length === 0) return null;
            return (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>Ver fotos:</span>
                {withPhotos.map((c) => (
                  <span key={c.value} className="inline-flex items-center gap-1">
                    <PhotoHintButton
                      imagePath={c.image_url}
                      caption={c.image_caption ?? null}
                      alt={c.label}
                      size="xs"
                    />
                    <span>{c.label}</span>
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      ) : null}

      {field.type === "radio" ? (
        <div className="space-y-1.5 pt-1">
          {choices.map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={field.id}
                checked={value?.value === c.value}
                onChange={() => onChange({ value: c.value })}
              />
              <ChoiceLabel label={c.label} recommended={c.recommended} />
              {c.image_url ? (
                <PhotoHintButton
                  imagePath={c.image_url}
                  caption={c.image_caption ?? null}
                  alt={c.label}
                  size="xs"
                />
              ) : null}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
