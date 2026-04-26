"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ClFormSection } from "@/lib/supabase/types";

import { getPublicSubmissionSummary, type PublicSubmissionSummary } from "./actions";
import { DownloadSubmissionPdfButton } from "./pdf/download-buttons";
import { formatDateTime, formatFieldValue } from "./pdf/format-value";

interface Props {
  token: string;
  submissionId: string;
  clientName: string | null;
  templateName: string;
  projectName?: string;
}

export function PublicSubmissionSummaryDialog({
  token,
  submissionId,
  clientName,
  templateName,
  projectName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<PublicSubmissionSummary | null>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!open || summary || fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    getPublicSubmissionSummary(token, submissionId)
      .then((res) => {
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        if ("data" in res && res.data) {
          setSummary(res.data);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      })
      .finally(() => {
        fetchingRef.current = false;
        setLoading(false);
      });
  }, [open, summary, token, submissionId]);

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
          <DialogHeader className="flex flex-row items-center justify-between gap-3 pr-8">
            <DialogTitle>Resumo das respostas</DialogTitle>
            {summary ? (
              <DownloadSubmissionPdfButton
                token={token}
                submissionId={submissionId}
                clientName={clientName}
                templateName={templateName}
                projectName={projectName}
              />
            ) : null}
          </DialogHeader>

          <div className="-mx-6 max-h-[70vh] overflow-y-auto px-6 pb-2">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </div>
            ) : error ? (
              <p className="py-8 text-center text-sm text-destructive">{error}</p>
            ) : summary ? (
              <SummaryContent
                summary={summary}
                fallbackName={clientName}
                fallbackTemplate={templateName}
              />
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
  const { submission, template, sections, fields, values, matrixValues } = summary;

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
          Enviado em {formatDateTime(submission.submitted_at ?? submission.created_at)}
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
              <div className="text-sm font-semibold uppercase tracking-wide text-foreground">
                {section.title}
              </div>
            ) : null}

            <div className="space-y-2">
              {visible.map((field) => {
                if (isMatrix) {
                  return (
                    <div key={field.id} className="rounded-md border p-3 text-sm">
                      <div className="font-medium">{field.label}</div>
                      <dl className="mt-2 grid gap-1 text-xs">
                        {environments.map((env) => {
                          const v = matrixByKey.get(`${field.id}::${env}`);
                          return (
                            <div key={env} className="flex items-baseline gap-2">
                              <dt className="w-28 shrink-0 font-medium uppercase tracking-wide text-muted-foreground">
                                {env}
                              </dt>
                              <dd>
                                {formatFieldValue(field, v?.value ?? null)}
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
                    className="grid grid-cols-[140px_1fr] items-baseline gap-3 rounded-md border px-3 py-1.5 text-sm sm:grid-cols-[200px_1fr]"
                  >
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {field.label}
                    </dt>
                    <dd className="leading-tight">
                      {formatFieldValue(field, v?.value ?? null)}
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
