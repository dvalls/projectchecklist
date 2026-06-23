"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, Eye, FileText, ImageIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldPreview } from "@/components/form-builder/field-preview";
import { createClient } from "@/lib/supabase/client";
import type {
  ClDiscipline,
  ClFormField,
  ClFormSection,
  ClFormTemplate,
} from "@/lib/supabase/types";

interface ProjectPreviewButtonProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  projectImageUrl: string | null;
  storageBaseUrl: string;
  templates: ClFormTemplate[];
  disciplines: ClDiscipline[];
}

interface TemplateDetail {
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
}

export function ProjectPreviewButton({
  projectName,
  projectDescription,
  projectImageUrl,
  storageBaseUrl,
  templates,
  disciplines,
}: ProjectPreviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function openTemplate(template: ClFormTemplate) {
    setLoading(true);
    const supabase = createClient();
    const [{ data: sections }, { data: fields }] = await Promise.all([
      supabase
        .from("cl_form_sections")
        .select("*")
        .eq("template_id", template.id)
        .order("position"),
      supabase
        .from("cl_form_fields")
        .select("*")
        .eq("template_id", template.id)
        .order("position"),
    ]);
    setDetail({
      template,
      sections: (sections ?? []) as ClFormSection[],
      fields: (fields ?? []) as ClFormField[],
    });
    setLoading(false);
  }

  function handleClose(value: boolean) {
    setOpen(value);
    if (!value) {
      setDetail(null);
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="icon"
        className="h-7 w-7 rounded-full opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
        title="Pré-visualizar"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">Pré-visualizar</span>
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detail ? (
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  className="-ml-1 flex items-center gap-1.5 rounded p-1 text-muted-foreground hover:text-foreground"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">
                {detail ? detail.template.name : projectName}
              </span>
            </DialogTitle>
          </DialogHeader>

          {detail ? (
            <TemplateFormPreview sections={detail.sections} fields={detail.fields} />
          ) : (
            <ProjectOverview
              projectName={projectName}
              projectDescription={projectDescription}
              projectImageUrl={projectImageUrl}
              storageBaseUrl={storageBaseUrl}
              templates={templates}
              disciplines={disciplines}
              loading={loading}
              onSelectTemplate={openTemplate}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProjectOverview({
  projectName,
  projectDescription,
  projectImageUrl,
  storageBaseUrl,
  templates,
  disciplines,
  loading,
  onSelectTemplate,
}: {
  projectName: string;
  projectDescription: string | null;
  projectImageUrl: string | null;
  storageBaseUrl: string;
  templates: ClFormTemplate[];
  disciplines: ClDiscipline[];
  loading: boolean;
  onSelectTemplate: (t: ClFormTemplate) => void;
}) {
  const disciplineMap = new Map(disciplines.map((d) => [d.id, d]));

  return (
    <div className="space-y-4">
      <div className="relative h-36 w-full overflow-hidden rounded-md bg-gradient-to-br from-primary/10 to-muted">
        {projectImageUrl ? (
          <Image
            src={`${storageBaseUrl}/${projectImageUrl}`}
            alt={projectName}
            fill
            className="object-cover"
            sizes="672px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
            <ImageIcon className="h-10 w-10" />
          </div>
        )}
      </div>

      {projectDescription && (
        <p className="text-sm text-muted-foreground">{projectDescription}</p>
      )}

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
          Formulários ({templates.length})
        </p>
        {templates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nenhum formulário neste projeto.
          </p>
        ) : (
          <ul className="space-y-1">
            {templates.map((t) => {
              const discipline = t.discipline_id
                ? disciplineMap.get(t.discipline_id)
                : null;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onSelectTemplate(t)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-left">
                      {discipline && (
                        <span className="mr-1.5 font-medium text-muted-foreground">
                          {discipline.name}
                        </span>
                      )}
                      {t.name}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TemplateFormPreview({
  sections,
  fields,
}: {
  sections: ClFormSection[];
  fields: ClFormField[];
}) {
  const fieldsBySection = new Map<string | null, ClFormField[]>();
  for (const f of fields) {
    const key = f.section_id ?? null;
    const list = fieldsBySection.get(key) ?? [];
    list.push(f);
    fieldsBySection.set(key, list);
  }

  const effectiveSections: {
    id: string | null;
    title: string;
    subtitle: string | null;
    columns: number;
  }[] =
    sections.length > 0
      ? sections
      : [{ id: null, title: "Campos", subtitle: null, columns: 1 }];

  const hasContent = fields.length > 0;

  if (!hasContent) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Este formulário não possui campos cadastrados.
      </p>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-6">
        {effectiveSections.map((sec) => {
          const sectionFields = fieldsBySection.get(sec.id) ?? [];
          if (sectionFields.length === 0) return null;
          return (
            <div key={sec.id ?? "unsectioned"} className="space-y-3">
              <div className="border-b pb-1">
                <div className="inline-block bg-foreground px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-background">
                  {sec.title || "(sem título)"}
                </div>
                {sec.subtitle ? (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {sec.subtitle}
                  </p>
                ) : null}
              </div>
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${sec.columns}, minmax(0, 1fr))`,
                }}
              >
                {sectionFields.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      gridColumn: `span ${Math.min(f.column_span, sec.columns)}`,
                    }}
                  >
                    <FieldPreview field={f} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
