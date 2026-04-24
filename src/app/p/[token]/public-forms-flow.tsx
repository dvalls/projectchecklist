"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  clearDraftProgress,
  writeDraftProgress,
} from "./draft-progress";

import { ImageDisplayField } from "@/components/form-builder/field-preview";
import { Button } from "@/components/ui/button";
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

import {
  createPublicSubmission,
  type PublicSubmissionMatrixValueInput,
  type PublicSubmissionValueInput,
} from "./actions";

interface Props {
  token: string;
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
  identity: { client_name: string; client_email: string };
  onDone?: () => void;
  backHref?: string;
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
  if (v.selected.length === 0 && !v.other) return null;
  return JSON.stringify({
    selected: v.selected,
    ...(v.other ? { other: v.other } : {}),
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

type Step = "form" | "done";

export function PublicFormsFlow({
  token,
  template,
  sections,
  fields,
  identity,
  onDone,
  backHref,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const clientName = identity.client_name;
  const clientEmail = identity.client_email;

  if (step === "done") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <h2 className="text-xl font-semibold">
            Obrigado, {clientName.split(" ")[0]}!
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Sua resposta foi registrada com sucesso.
          </p>
          {backHref ? (
            <Button asChild variant="outline" className="mt-2">
              <a href={backHref}>Voltar para a lista</a>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <PublicSubmissionForm
      token={token}
      template={template}
      sections={sections}
      fields={fields}
      clientName={clientName}
      clientEmail={clientEmail}
      onSuccess={() => {
        setStep("done");
        onDone?.();
      }}
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
  onSuccess,
}: {
  token: string;
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
  clientName: string;
  clientEmail: string;
  onSuccess: () => void;
}) {
  const isMatrix = template.layout_mode === "matrix";
  const environments = (template.environments ?? []) as string[];

  const envScope = isMatrix ? environments : [undefined as string | undefined];

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

  const [values, setValues] = useState<Record<string, FieldValue>>(
    initialValues,
  );
  const [isSubmitting, startSubmitting] = useTransition();

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

  useEffect(() => {
    if (progress.total === 0) return;
    writeDraftProgress(token, template.id, clientEmail, {
      done: progress.done,
      total: progress.total,
    });
  }, [progress, token, template.id, clientEmail]);

  function handleSubmit() {
    const inputs: PublicSubmissionValueInput[] = [];
    const matrixInputs: PublicSubmissionMatrixValueInput[] = [];

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
            toast.error(
              `${f.label}${env ? ` (${env})` : ""}: obrigatório.`,
            );
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
      const res = await createPublicSubmission({
        token,
        template_id: template.id,
        client_name: clientName,
        client_email: clientEmail,
        values: inputs,
        matrix_values: matrixInputs,
      });

      if (res && "error" in res && res.error) {
        toast.error(res.error);
        return;
      }

      clearDraftProgress(token, template.id, clientEmail);
      onSuccess();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        {template.description ? (
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        ) : null}
        <p className="pt-2 text-xs text-muted-foreground">
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
      <CardContent className="space-y-8">
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

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
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
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))`,
              }}
            >
              {sectionFields.map((field) => {
                const key = makeFieldKey(field.id);
                const visible = evaluateVisible(field.visible_when, values);
                if (!visible) return null;
                return (
                  <div
                    key={field.id}
                    style={{
                      gridColumn: `span ${Math.min(
                        field.column_span,
                        section.columns,
                      )}`,
                    }}
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
                        return (
                          <td
                            key={env}
                            className="border-l border-t p-2 align-top"
                          >
                            {visible ? (
                              <FieldInput
                                field={field}
                                value={values[key]}
                                compact
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

  const showLabel = !compact;
  const groupValue =
    field.type === "checkbox_group"
      ? parseCheckboxGroup(value?.value ?? null)
      : null;

  function updateGroup(next: CheckboxGroupValue) {
    onChange({ value: serializeCheckboxGroup(next) });
  }

  return (
    <div className="space-y-1.5">
      {showLabel ? (
        <Label>
          {field.label}
          {field.required ? (
            <span className="ml-1 text-destructive-foreground">*</span>
          ) : null}
        </Label>
      ) : null}
      {showLabel && field.help_text ? (
        <p className="text-xs italic text-muted-foreground">
          {field.help_text}
        </p>
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
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={value?.value === "true"}
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
                {c.label}
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
                    other: v ? groupValue.other ?? "" : undefined,
                  })
                }
              />
              <span>Outra:</span>
              <Input
                className="h-8 flex-1"
                value={groupValue.other ?? ""}
                disabled={groupValue.other === undefined}
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
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={field.id}
                checked={value?.value === c.value}
                onChange={() => onChange({ value: c.value })}
              />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}

    </div>
  );
}
