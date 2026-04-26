"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, FileText, FolderOpen, Loader2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ClDiscipline } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

import { importExistingTemplate } from "../../[id]/templates/actions";
import { createTemplateBlank } from "../actions";

import type { ImportableTemplate } from "../../[id]/templates/import-existing-dialog";

export interface AddedTemplate {
  id: string;
  name: string;
  origin: "imported" | "created";
  source_id?: string;
}

interface Props {
  projectId: string;
  importable: ImportableTemplate[];
  disciplines: ClDiscipline[];
  added: AddedTemplate[];
  onChangeAdded: (next: AddedTemplate[]) => void;
}

type TabId = "import" | "create";

export function StepForms({
  projectId,
  importable,
  disciplines,
  added,
  onChangeAdded,
}: Props) {
  const [tab, setTab] = useState<TabId>(importable.length > 0 ? "import" : "create");

  const [query, setQuery] = useState("");
  const [pendingImportIds, setPendingImportIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const [newName, setNewName] = useState("");
  const [newDiscipline, setNewDiscipline] = useState<string>("none");
  const [creating, setCreating] = useState(false);

  const importedSourceIds = useMemo(
    () =>
      new Set(
        added
          .filter((a) => a.origin === "imported" && a.source_id)
          .map((a) => a.source_id as string),
      ),
    [added],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return importable;
    return importable.filter((t) =>
      [t.name, t.project_name, t.discipline_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [importable, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ImportableTemplate[]>();
    for (const t of filtered) {
      const arr = map.get(t.project_name) ?? [];
      arr.push(t);
      map.set(t.project_name, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
  }, [filtered]);

  function handleImport(t: ImportableTemplate) {
    setPendingImportIds((prev) => new Set(prev).add(t.id));
    startTransition(async () => {
      const result = await importExistingTemplate(projectId, t.id);
      setPendingImportIds((prev) => {
        const next = new Set(prev);
        next.delete(t.id);
        return next;
      });
      if (result?.error || !result?.templateId) {
        toast.error(result?.error ?? "Erro ao importar formulário.");
        return;
      }
      onChangeAdded([
        ...added,
        {
          id: result.templateId,
          name: t.name,
          origin: "imported",
          source_id: t.id,
        },
      ]);
      toast.success(`Formulário "${t.name}" adicionado.`);
    });
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) {
      toast.error("Informe um nome para o formulário.");
      return;
    }
    setCreating(true);
    startTransition(async () => {
      const result = await createTemplateBlank(projectId, {
        name,
        discipline_id: newDiscipline === "none" ? null : newDiscipline,
      });
      setCreating(false);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      onChangeAdded([
        ...added,
        {
          id: result.templateId,
          name: result.name,
          origin: "created",
        },
      ]);
      setNewName("");
      setNewDiscipline("none");
      toast.success(`Formulário "${result.name}" criado.`);
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Formulários iniciais</h2>
        <p className="text-sm text-muted-foreground">
          Adicione formulários ao projeto importando de outros projetos ou criando novos
          em branco. Você pode pular e configurar depois.
        </p>
      </div>

      {added.length > 0 ? (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Adicionados a este projeto
          </div>
          <ul className="space-y-1.5">
            {added.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.name}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {a.origin === "imported" ? "Importado" : "Novo"}
                  </Badge>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onChangeAdded(added.filter((x) => x.id !== a.id))}
                  title="Remover da lista (não exclui o formulário)"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Remover daqui apenas tira da lista do wizard. Para excluir, gerencie depois
            dentro do projeto.
          </p>
        </div>
      ) : null}

      <div className="inline-flex rounded-md border bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab("import")}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "import"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Copy className="mr-1.5 inline h-3.5 w-3.5" />
          Importar existentes
        </button>
        <button
          type="button"
          onClick={() => setTab("create")}
          className={cn(
            "rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
            tab === "create"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className="mr-1.5 inline h-3.5 w-3.5" />
          Criar em branco
        </button>
      </div>

      {tab === "import" ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, projeto ou disciplina..."
              className="pl-9"
            />
          </div>

          <div className="max-h-[360px] space-y-4 overflow-y-auto rounded-md border p-3">
            {importable.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum formulário disponível em outros projetos.
              </p>
            ) : grouped.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
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
                    {items.map((t) => {
                      const isPending = pendingImportIds.has(t.id);
                      const alreadyImported = importedSourceIds.has(t.id);
                      return (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{t.name}</div>
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
                                <Badge variant="secondary" className="text-[10px]">
                                  Sem disciplina
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending || alreadyImported}
                            onClick={() => handleImport(t)}
                          >
                            {isPending ? (
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Copy className="mr-1.5 h-3.5 w-3.5" />
                            )}
                            {alreadyImported
                              ? "Adicionado"
                              : isPending
                                ? "Copiando..."
                                : "Adicionar"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 rounded-md border p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
            <div className="space-y-2">
              <Label htmlFor="new-form-name">Nome</Label>
              <Input
                id="new-form-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Premissas de estrutura"
              />
            </div>
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={newDiscipline} onValueChange={setNewDiscipline}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem disciplina</SelectItem>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="w-full sm:w-auto"
              >
                {creating ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                )}
                Adicionar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os formulários novos ficam vazios. Você poderá editar campos e seções dentro
            do projeto.
          </p>
        </div>
      )}
    </div>
  );
}
