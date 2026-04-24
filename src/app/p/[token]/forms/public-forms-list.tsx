"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, LogOut } from "lucide-react";

import { getDisciplineIcon } from "@/lib/disciplines/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type {
  ClDiscipline,
  ClFormSubmission,
  ClFormTemplate,
  ClProject,
} from "@/lib/supabase/types";

import { clearIdentity, readIdentity } from "../identity-storage";
import { readDraftProgress } from "../draft-progress";

interface Props {
  token: string;
  project: ClProject;
  disciplines: ClDiscipline[];
  templates: ClFormTemplate[];
  submissions: Pick<
    ClFormSubmission,
    "id" | "template_id" | "client_email" | "status"
  >[];
  requiredCountByTemplate: Record<string, number>;
}

export function PublicFormsList({
  token,
  project,
  disciplines,
  templates,
  submissions,
  requiredCountByTemplate,
}: Props) {
  const router = useRouter();
  const [identity, setIdentity] = useState<{
    client_name: string;
    client_email: string;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readIdentity(token);
    setHydrated(true);
    if (!saved) {
      router.replace(`/p/${token}`);
      return;
    }
    setIdentity(saved);
  }, [token, router]);

  const completedByTemplate = useMemo(() => {
    if (!identity) return new Set<string>();
    const email = identity.client_email.toLowerCase();
    const set = new Set<string>();
    for (const s of submissions) {
      if (
        s.status === "submitted" &&
        s.client_email?.toLowerCase() === email
      ) {
        set.add(s.template_id);
      }
    }
    return set;
  }, [submissions, identity]);

  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    function handleUpdate() {
      setProgressTick((n) => n + 1);
    }
    window.addEventListener("checklist-progress", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("checklist-progress", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const progressByTemplate = useMemo(() => {
    const map = new Map<string, { done: number; total: number }>();
    if (!identity) return map;
    for (const t of templates) {
      const total = requiredCountByTemplate[t.id] ?? 0;
      if (completedByTemplate.has(t.id)) {
        map.set(t.id, { done: total, total });
        continue;
      }
      const draft = readDraftProgress(token, t.id, identity.client_email);
      const done = Math.min(draft?.done ?? 0, total);
      map.set(t.id, { done, total });
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    templates,
    completedByTemplate,
    identity,
    requiredCountByTemplate,
    token,
    progressTick,
  ]);

  const groups = useMemo(() => {
    const map = new Map<
      string | null,
      { discipline: ClDiscipline | null; templates: ClFormTemplate[] }
    >();
    for (const t of templates) {
      const key = t.discipline_id;
      if (!map.has(key)) {
        const discipline =
          disciplines.find((d) => d.id === key) ?? null;
        map.set(key, { discipline, templates: [] });
      }
      map.get(key)!.templates.push(t);
    }
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (!a.discipline && !b.discipline) return 0;
      if (!a.discipline) return 1;
      if (!b.discipline) return -1;
      return a.discipline.position - b.discipline.position;
    });
    return arr;
  }, [templates, disciplines]);

  const total = templates.length;
  const done = completedByTemplate.size;

  function handleLogout() {
    clearIdentity(token);
    router.push(`/p/${token}`);
  }

  if (!hydrated || !identity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <Link
            href={`/p/${token}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à capa
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-xs text-muted-foreground sm:block">
              <div className="font-medium text-foreground">
                {identity.client_name}
              </div>
              <div>{identity.client_email}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="mr-1 h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha os formulários abaixo e preencha na ordem que preferir.
          </p>
          {total > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Progresso:{" "}
              <strong className="text-foreground">
                {done}/{total}
              </strong>{" "}
              formulários concluídos
            </p>
          ) : null}
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum formulário disponível neste link no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groups.map(({ discipline, templates: groupTemplates }) => {
              const Icon = getDisciplineIcon(discipline?.name);
              return (
              <section key={discipline?.id ?? "no-discipline"}>
                <div className="mb-2 flex items-center gap-2">
                  <Icon
                    className="h-4 w-4"
                    style={
                      discipline ? { color: discipline.color } : undefined
                    }
                    aria-hidden
                  />
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {discipline?.name ?? "Sem disciplina"}
                  </h2>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {groupTemplates.map((t) => {
                    const completed = completedByTemplate.has(t.id);
                    const progress = progressByTemplate.get(t.id) ?? {
                      done: 0,
                      total: requiredCountByTemplate[t.id] ?? 0,
                    };
                    const hasRequired = progress.total > 0;
                    const isComplete =
                      completed || (hasRequired && progress.done >= progress.total);
                    return (
                      <Link
                        key={t.id}
                        href={`/p/${token}/forms/${t.id}`}
                        className="block"
                      >
                        <Card className="h-full transition-colors hover:border-primary/40">
                          <CardContent className="flex items-center justify-between gap-3 p-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium">
                                  {t.name}
                                </span>
                                {completed ? (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-500 text-emerald-600"
                                  >
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    Concluído
                                  </Badge>
                                ) : null}
                              </div>
                              {t.description ? (
                                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                                  {t.description}
                                </p>
                              ) : null}
                              {hasRequired ? (
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={
                                      isComplete
                                        ? "border-emerald-500 text-emerald-600"
                                        : progress.done > 0
                                        ? "border-amber-500 text-amber-600"
                                        : "text-muted-foreground"
                                    }
                                  >
                                    {progress.done}/{progress.total}{" "}
                                    obrigatórios
                                  </Badge>
                                </div>
                              ) : null}
                            </div>
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
