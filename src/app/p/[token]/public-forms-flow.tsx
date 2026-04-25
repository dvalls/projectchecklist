"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Lock } from "lucide-react";

import {
  readDraftSubmission,
  type DraftSubmissionMatrixValue,
  type DraftSubmissionValue,
  writeDraftSubmission,
  writeDraftProgress,
} from "./draft-progress";

import { ImageDisplayField } from "@/components/form-builder/field-preview";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  VisibleWhen,
} from "@/lib/supabase/types";

import type {
  PreviousMatrixValuesMap,
  PreviousValuesMap,
} from "./forms/[templateId]/public-fill-wrapper";

interface Props {
  token: string;
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
  identity: { client_name: string; client_email: string };
  previousByField?: PreviousValuesMap;
  previousByMatrix?: PreviousMatrixValuesMap;
  allowResubmit?: boolean;
}

interface CheckboxGroupValue {
  selected: string[];
  other?: string;
}

type FieldValue = {
  value: string | null;
};

function isDisplayOnly(type: ClFormField["type"]) {
  return type === "info" || type === "image";
}

function makeFieldKey(fieldId: string, env?: string) {
  return env ? `${fieldId}::${env}` : fieldId;
}

function parseCheckboxGroup(value: string | null): CheckboxGroupValue {
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
    // fallthrough
  }
  return { selected: [] };
}

function serializeCheckboxGroup(v: CheckboxGroupValue): string | null {
  const hasOther = v.other !== undefined;
  if (v.selected.length === 0 && !hasOther) return null;
  return JSON.stringify({
    selected: v.selected,
    ...(hasOther ? { other: v.other ?? "" } : {}),
  });
}

function evaluateVisible(
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
      // not JSON
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

export function PublicFormsFlow({
  token,
  template,
  sections,
  fields,
  identity,
  previousByField,
  previousByMatrix,
  allowResubmit = false,
}: Props) {
  const clientName = identity.client_name;
  const clientEmail = identity.client_email;

  return (
    <PublicSubmissionForm
      token={token}
      template={template}
      sections={sections}
      fields={fields}
      clientName={clientName}
      clientEmail={clientEmail}
      previousByField={previousByField ?? {}}
      previousByMatrix={previousByMatrix ?? {}}
      allowResubmit={allowResubmit}
    />
  );
}

function PublicSubmissionForm({
  token,
  template,
  sections,
  fields,
  clientName,
  clientEmail,
  previousByField,
  previousByMatrix,
  allowResubmit,
}: {
  token: string;
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
  clientName: string;
  clientEmail: string;
  previousByField: PreviousValuesMap;
  previousByMatrix: PreviousMatrixValuesMap;
  allowResubmit: boolean;
}) {
  const isMatrix = template.layout_mode === "matrix";
  const environments = useMemo(
    () => (template.environments ?? []) as string[],
    [template.environments],
  );

  const envScope = useMemo(
    () => (isMatrix ? environments : [undefined as string | undefined]),
    [environments, isMatrix],
  );

  function getPrevious(fieldId: string, env: string | undefined) {
    if (env) {
      return previousByMatrix[fieldId]?.[env];
    }
    return previousByField[fieldId];
  }

  const initialValues = useMemo<Record<string, FieldValue>>(() => {
    const savedDraft = readDraftSubmission(token, template.id, clientEmail);
    const savedValues = new Map(
      savedDraft?.values.map((v) => [makeFieldKey(v.field_id), v.value]) ?? [],
    );
    const savedMatrixValues = new Map(
      savedDraft?.matrix_values.map((v) => [
        makeFieldKey(v.field_id, v.env_key),
        v.value,
      ]) ?? [],
    );
    const out: Record<string, FieldValue> = {};
    for (const f of fields) {
      if (isDisplayOnly(f.type)) continue;
      for (const env of envScope) {
        const saved = env
          ? savedMatrixValues.get(makeFieldKey(f.id, env))
          : savedValues.get(makeFieldKey(f.id));
        const prev = getPrevious(f.id, env);
        if (saved !== undefined && (allowResubmit || !prev)) {
          out[makeFieldKey(f.id, env)] = { value: saved };
        } else if (prev && prev.value !== null) {
          out[makeFieldKey(f.id, env)] = { value: prev.value };
        } else {
          out[makeFieldKey(f.id, env)] = {
            value: f.type === "checkbox" ? "false" : null,
          };
        }
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    fields,
    isMatrix,
    token,
    template.id,
    clientEmail,
    allowResubmit,
    previousByField,
    previousByMatrix,
  ]);

  const [values, setValues] = useState<Record<string, FieldValue>>(
    initialValues,
  );

  function setFieldValue(key: string, patch: Partial<FieldValue>) {
    setValues((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch },
    }));
  }

  function isFieldAnswered(field: ClFormField, v: FieldValue | undefined) {
    if (field.type === "checkbox") return v?.value === "true";
    if (field.type === "checkbox_group") {
      const parsed = parseCheckboxGroup(v?.value ?? null);
      return parsed.selected.length > 0 || Boolean(parsed.other);
    }
    return Boolean(v?.value && v.value.trim() !== "");
  }

  const hasAnyPrevious = useMemo(() => {
    for (const f of fields) {
      if (isDisplayOnly(f.type)) continue;
      for (const env of envScope) {
        if (getPrevious(f.id, env)) return true;
      }
    }
    return false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, isMatrix, previousByField, previousByMatrix]);

  const progress = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const env of envScope) {
      for (const f of fields) {
        if (isDisplayOnly(f.type)) continue;
        if (!f.required) continue;
        total += 1;
        const key = makeFieldKey(f.id, env);
        const visible = evaluateVisible(f.visible_when, values, env);
        if (!visible) {
          done += 1;
          continue;
        }
        if (isFieldAnswered(f, values[key])) {
          done += 1;
        }
      }
    }
    return { done, total };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, values, envScope]);

  const draftSubmission = useMemo(() => {
    const inputs: DraftSubmissionValue[] = [];
    const matrixInputs: DraftSubmissionMatrixValue[] = [];
    for (const env of envScope) {
      for (const f of fields) {
        if (isDisplayOnly(f.type)) continue;
        const key = makeFieldKey(f.id, env);
        const v = values[key];
        const visible = evaluateVisible(f.visible_when, values, env);

        if (f.required && visible) {
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
            continue;
          }
        }

        if (!visible) continue;

        const prev = getPrevious(f.id, env);
        const locked = Boolean(prev) && !allowResubmit;
        const payload = {
          field_id: f.id,
          value: locked ? prev?.value ?? null : v?.value ?? null,
          image_url: locked ? prev?.image_url ?? null : null,
        };

        if (env) {
          matrixInputs.push({ ...payload, env_key: env });
        } else {
          inputs.push(payload);
        }
      }
    }
    return { values: inputs, matrix_values: matrixInputs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, values, envScope, allowResubmit, previousByField, previousByMatrix]);

  useEffect(() => {
    writeDraftProgress(token, template.id, clientEmail, {
      done: progress.done,
      total: progress.total,
    });
    writeDraftSubmission(token, template.id, clientEmail, draftSubmission);
  }, [progress, draftSubmission, token, template.id, clientEmail]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">{template.name}</CardTitle>
        {template.description ? (
          <p className="break-words text-sm text-muted-foreground">
            {template.description}
          </p>
        ) : null}
        <p className="break-words pt-2 text-xs text-muted-foreground">
          Respondendo como <strong>{clientName}</strong> ({clientEmail})
        </p>
        {progress.total > 0 ? (
          <p className="pt-1 text-xs text-muted-foreground">
            Obrigatórios:{" "}
            <strong
              className={
                progress.done >= progress.total
                  ? "text-emerald-600"
                  : "text-foreground"
              }
            >
              {progress.done}/{progress.total}
            </strong>
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-8 p-4 pt-0 sm:p-6 sm:pt-0">
        {hasAnyPrevious ? (
          <div
            className={
              "flex items-start gap-2 rounded-md border p-3 text-xs " +
              (allowResubmit
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-muted-foreground/20 bg-muted/40 text-muted-foreground")
            }
          >
            {allowResubmit ? (
              <History className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p>
              {allowResubmit
                ? "Alguns campos já foram respondidos em preenchimentos anteriores e vêm pré-preenchidos. Você pode alterá-los se necessário."
                : "Alguns campos já foram respondidos em preenchimentos anteriores e estão bloqueados. Para alterar, peça ao responsável para habilitar novo preenchimento nas configurações do projeto."}
            </p>
          </div>
        ) : null}

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
            previousByMatrix={previousByMatrix}
            allowResubmit={allowResubmit}
          />
        ) : (
          <StandardRenderer
            sections={sections}
            fields={fields}
            values={values}
            onChange={setFieldValue}
            previousByField={previousByField}
            allowResubmit={allowResubmit}
          />
        )}

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          <Button
            onClick={handleSubmit}
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
  previousByField,
  allowResubmit,
}: {
  sections: ClFormSection[];
  fields: ClFormField[];
  values: Record<string, FieldValue>;
  onChange: (key: string, patch: Partial<FieldValue>) => void;
  previousByField: PreviousValuesMap;
  allowResubmit: boolean;
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
              className="grid grid-cols-1 gap-4 md:[grid-template-columns:var(--section-columns)]"
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
                const hasPrevious = Boolean(previousByField[field.id]);
                const locked = hasPrevious && !allowResubmit;
                return (
                  <div
                    key={field.id}
                    className="md:[grid-column:var(--field-span)]"
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
                      hasPrevious={hasPrevious}
                      locked={locked}
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
  previousByMatrix,
  allowResubmit,
}: {
  sections: ClFormSection[];
  fields: ClFormField[];
  environments: string[];
  values: Record<string, FieldValue>;
  onChange: (key: string, patch: Partial<FieldValue>) => void;
  previousByMatrix: PreviousMatrixValuesMap;
  allowResubmit: boolean;
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
            <p className="text-[11px] text-muted-foreground md:hidden">
              Deslize a tabela para o lado para ver todos os ambientes.
            </p>
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
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
                  {secRows.map((field) => (
                    <tr key={field.id} className="align-top">
                      <td className="sticky left-0 z-10 w-[200px] bg-background p-2 text-sm">
                        <div className="font-medium">
                          {field.label}
                          {field.required ? (
                            <span className="ml-1 text-destructive-foreground">
                              *
                            </span>
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
                        const hasPrevious = Boolean(
                          previousByMatrix[field.id]?.[env],
                        );
                        const locked = hasPrevious && !allowResubmit;
                        return (
                          <td
                            key={env}
                            className={
                              "border-l border-t p-2 align-top" +
                              (hasPrevious ? " bg-muted/30" : "")
                            }
                          >
                            {visible ? (
                              <FieldInput
                                field={field}
                                value={values[key]}
                                compact
                                hasPrevious={hasPrevious}
                                locked={locked}
                                onChange={(patch) => onChange(key, patch)}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
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
  const isAllBullets =
    lines.length > 0 && lines.every((l) => l.trim().startsWith("- "));

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
  hasPrevious = false,
  locked = false,
  onChange,
}: {
  field: ClFormField;
  value: FieldValue | undefined;
  compact?: boolean;
  hasPrevious?: boolean;
  locked?: boolean;
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

  const showLabel = !compact;
  const groupValue =
    field.type === "checkbox_group"
      ? parseCheckboxGroup(value?.value ?? null)
      : null;

  function updateGroup(next: CheckboxGroupValue) {
    if (locked) return;
    onChange({ value: serializeCheckboxGroup(next) });
  }

  const previousBadge = hasPrevious ? (
    <Badge
      variant="outline"
      className={
        locked
          ? "border-muted-foreground/30 text-muted-foreground"
          : "border-amber-500 text-amber-600"
      }
    >
      {locked ? (
        <Lock className="mr-1 h-3 w-3" />
      ) : (
        <History className="mr-1 h-3 w-3" />
      )}
      {locked ? "Já respondido" : "Preenchido anteriormente"}
    </Badge>
  ) : null;

  const containerClassName =
    "space-y-1.5" + (locked ? " opacity-90" : "");

  return (
    <div className={containerClassName}>
      {showLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          <Label>
            {field.label}
            {field.required ? (
              <span className="ml-1 text-destructive-foreground">*</span>
            ) : null}
          </Label>
          {previousBadge}
        </div>
      ) : previousBadge ? (
        <div className="flex">{previousBadge}</div>
      ) : null}
      {showLabel && field.help_text ? (
        <p className="text-xs italic text-muted-foreground">
          {field.help_text}
        </p>
      ) : null}

      {field.type === "text" ? (
        <Input
          value={value?.value ?? ""}
          disabled={locked}
          readOnly={locked}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "number" ? (
        <Input
          type="number"
          value={value?.value ?? ""}
          disabled={locked}
          readOnly={locked}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          rows={compact ? 2 : 3}
          value={value?.value ?? ""}
          disabled={locked}
          readOnly={locked}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "date" ? (
        <Input
          type="date"
          value={value?.value ?? ""}
          disabled={locked}
          readOnly={locked}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "checkbox" ? (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={value?.value === "true"}
            disabled={locked}
            onCheckedChange={(checked) =>
              onChange({ value: checked ? "true" : "false" })
            }
          />
          <span className="text-sm">{compact ? "Sim" : field.label}</span>
        </div>
      ) : null}

      {field.type === "checkbox_group" && groupValue ? (
        <div className="space-y-1.5 pt-1">
          {choices.map((c) => {
            const checked = groupValue.selected.includes(c.value);
            return (
              <label
                key={c.value}
                className={
                  "flex min-w-0 items-center gap-2 text-sm " +
                  (locked ? "cursor-not-allowed" : "cursor-pointer")
                }
              >
                <Checkbox
                  checked={checked}
                  disabled={locked}
                  onCheckedChange={(v) => {
                    const nextSelected = v
                      ? [...groupValue.selected, c.value]
                      : groupValue.selected.filter((s) => s !== c.value);
                    updateGroup({ ...groupValue, selected: nextSelected });
                  }}
                />
                <span className="min-w-0 break-words">{c.label}</span>
              </label>
            );
          })}
          {opts.allow_other ? (
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
              <Checkbox
                checked={groupValue.other !== undefined}
                disabled={locked}
                onCheckedChange={(v) =>
                  updateGroup({
                    ...groupValue,
                    other: v ? groupValue.other ?? "" : undefined,
                  })
                }
              />
              <span>Outra:</span>
              <Input
                className="h-8 flex-1"
                value={groupValue.other ?? ""}
                disabled={locked || groupValue.other === undefined}
                readOnly={locked}
                onChange={(e) =>
                  updateGroup({ ...groupValue, other: e.target.value })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {field.type === "select" ? (
        <Select
          value={value?.value ?? ""}
          disabled={locked}
          onValueChange={(v) => onChange({ value: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {choices.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {field.type === "radio" ? (
        <div className="space-y-1.5 pt-1">
          {choices.map((c) => (
            <label
              key={c.value}
              className={
                "flex min-w-0 items-center gap-2 text-sm " +
                (locked ? "cursor-not-allowed" : "cursor-pointer")
              }
            >
              <input
                type="radio"
                name={field.id}
                checked={value?.value === c.value}
                disabled={locked}
                onChange={() => onChange({ value: c.value })}
              />
              <span className="min-w-0 break-words">{c.label}</span>
            </label>
          ))}
        </div>
      ) : null}

    </div>
  );
}
