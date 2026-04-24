"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, FolderOpen, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { importExistingTemplate } from "./actions";

export interface ImportableTemplate {
  id: string;
  name: string;
  project_id: string;
  project_name: string;
  discipline_name: string | null;
  discipline_color: string | null;
}

export function ImportExistingTemplateDialog({
  targetProjectId,
  templates,
  trigger,
}: {
  targetProjectId: string;
  templates: ImportableTemplate[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) =>
      [t.name, t.project_name, t.discipline_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [templates, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ImportableTemplate[]>();
    for (const t of filtered) {
      const arr = map.get(t.project_name) ?? [];
      arr.push(t);
      map.set(t.project_name, arr);
    }
    return Array.from(map.entries()).sort((a, b) =>
      a[0].localeCompare(b[0], "pt-BR"),
    );
  }, [filtered]);

  function handleImport(templateId: string, templateName: string) {
    setPendingId(templateId);
    startTransition(async () => {
      const result = await importExistingTemplate(targetProjectId, templateId);
      setPendingId(null);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Formulário "${templateName}" adicionado ao projeto.`);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Adicionar formulário existente</DialogTitle>
          <DialogDescription>
            Escolha um formulário de outro projeto para copiar (campos, seções
            e layout) para este projeto.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, projeto ou disciplina..."
            className="pl-9"
          />
        </div>

        <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
          {templates.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum formulário disponível em outros projetos.
            </p>
          ) : grouped.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhum formulário corresponde à busca.
            </p>
          ) : (
            grouped.map(([projectName, items]) => (
              <div key={projectName} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {projectName}
                </div>
                <div className="space-y-1.5">
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {t.name}
                        </div>
                        <div className="mt-0.5">
                          {t.discipline_name ? (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                              style={{
                                borderColor: t.discipline_color ?? undefined,
                                color: t.discipline_color ?? undefined,
                              }}
                            >
                              {t.discipline_name}
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              Sem disciplina
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingId === t.id}
                        onClick={() => handleImport(t.id, t.name)}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        {pendingId === t.id ? "Copiando..." : "Adicionar"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
