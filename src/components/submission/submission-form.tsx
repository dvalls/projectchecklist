"use client";

import { useMemo, useState, useTransition } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

import { FieldInputControl } from "@/components/form-builder/field-input";
import { PhotoHintButton } from "@/components/form-builder/photo-hint-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ClFormField, ClFormSection, ClFormTemplate, FieldOptions } from "@/lib/supabase/types";

import {
  type FieldValue,
  type SubmissionMatrixValueInput,
  type SubmissionValueInput,
} from "@/lib/forms/types";
import { evaluateVisible, isDisplayOnly, makeFieldKey, parseCheckboxGroup } from "@/lib/forms/utils";

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
                    <FieldInputControl
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
                                <FieldInputControl
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

