"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ClFormField,
  ClFormSection,
  FieldOptions,
} from "@/lib/supabase/types";

import {
  getPublicSubmissionSummary,
  type PublicSubmissionSummary,
} from "./actions";

interface Props {
  token: string;
  submissionId: string;
  clientName: string | null;
  templateName: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function renderValue(field: ClFormField, raw: string | null): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  const opts = (field.options as Exclude<FieldOptions, null>) ?? {};
  const choices = opts.choices ?? [];

  if (field.type === "checkbox") {
    return raw === "true" ? "Sim" : "Não";
  }

  if (field.type === "checkbox_group") {
    try {
      const parsed = JSON.parse(raw);
      const selectedLabels = (parsed.selected ?? []).map((v: string) => {
        const choice = choices.find((c) => c.value === v);
        return choice?.label ?? v;
      });
      const parts = [...selectedLabels];
      if (parsed.other) parts.push(`Outra: ${parsed.other}`);
      return parts.length > 0 ? parts.join(", ") : "—";
    } catch {
      return raw;
    }
  }

  if (field.type === "select" || field.type === "radio") {
    const choice = choices.find((c) => c.value === raw);
    return choice?.label ?? raw;
  }

  return raw;
}

export function PublicSubmissionSummaryDialog({
  token,
  submissionId,
  clientName,
  templateName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PublicSubmissionSummary | null>(null);

  useEffect(() => {
    if (!open || summary || loading) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getPublicSubmissionSummary(token, submissionId)
      .then((res) => {
        if (cancelled) return;
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        if ("data" in res && res.data) {
          setSummary(res.data);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, summary, loading, token, submissionId]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-primary hover:text-primary"
        onClick={() => setOpen(true)}
      >
        <FileText className="mr-1 h-3.5 w-3.5" />
        Ver resumo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Resumo das respostas</DialogTitle>
          </DialogHeader>

          <div className="-mx-6 max-h-[70vh] overflow-y-auto px-6 pb-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : error ? (
              <p className="py-8 text-center text-sm text-destructive">
                {error}
              </p>
            ) : summary ? (
              <SummaryContent summary={summary} fallbackName={clientName} fallbackTemplate={templateName} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryContent({
  summary,
  fallbackName,
  fallbackTemplate,
}: {
  summary: PublicSubmissionSummary;
  fallbackName: string | null;
  fallbackTemplate: string;
}) {
  const { submission, template, sections, fields, values, matrixValues } =
    summary;

  const valuesByField = new Map(values.map((v) => [v.field_id, v] as const));
  const matrixByKey = new Map(
    matrixValues.map((v) => [`${v.field_id}::${v.env_key}`, v] as const),
  );

  const isMatrix = template.layout_mode === "matrix";
  const environments = (template.environments ?? []) as string[];

  const sectionsToRender: ClFormSection[] =
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
          },
        ];

  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/40 p-3 text-xs">
        <div className="font-semibold text-foreground">
          {template.name ?? fallbackTemplate}
        </div>
        <div className="mt-1 text-muted-foreground">
          {submission.client_name ?? fallbackName ?? "—"}
          {submission.client_email ? ` · ${submission.client_email}` : ""}
        </div>
        <div className="mt-0.5 text-muted-foreground">
          Enviado em {formatDate(submission.submitted_at ?? submission.created_at)}
        </div>
      </div>

      {sectionsToRender.map((section) => {
        const secFields =
          sections.length > 0
            ? fields.filter((f) => f.section_id === section.id)
            : fields;
        const visible = secFields.filter((f) => f.type !== "info");
        if (visible.length === 0) return null;

        return (
          <section key={section.id} className="space-y-2">
            {section.title ? (
              <div className="inline-block bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background">
                {section.title}
              </div>
            ) : null}

            <div className="space-y-2">
              {visible.map((field) => {
                if (isMatrix) {
                  return (
                    <div
                      key={field.id}
                      className="rounded-md border p-3 text-sm"
                    >
                      <div className="font-medium">{field.label}</div>
                      <dl className="mt-2 grid gap-1 text-xs">
                        {environments.map((env) => {
                          const v = matrixByKey.get(`${field.id}::${env}`);
                          return (
                            <div
                              key={env}
                              className="flex items-baseline gap-2"
                            >
                              <dt className="w-28 shrink-0 font-medium uppercase tracking-wide text-muted-foreground">
                                {env}
                              </dt>
                              <dd>
                                {renderValue(field, v?.value ?? null)}
                                {v?.image_url ? (
                                  <span className="ml-2 text-muted-foreground">
                                    [imagem]
                                  </span>
                                ) : null}
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  );
                }

                const v = valuesByField.get(field.id);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-[140px_1fr] items-baseline gap-3 rounded-md border p-3 text-sm sm:grid-cols-[200px_1fr]"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd>
                      {renderValue(field, v?.value ?? null)}
                      {v?.image_url ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          [imagem anexada]
                        </span>
                      ) : null}
                    </dd>
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
