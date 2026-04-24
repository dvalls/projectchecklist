"use client";

import Link from "next/link";
import { Eye, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import type { ClFormSubmission, ClFormTemplate } from "@/lib/supabase/types";

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

export function ProjectPublicSubmissionsDialog({
  projectName,
  submissions,
  templates,
}: {
  projectName: string;
  submissions: ClFormSubmission[];
  templates: ClFormTemplate[];
}) {
  const templateById = new Map(templates.map((t) => [t.id, t]));
  const count = submissions.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
        >
          <Users className="h-3.5 w-3.5" />
          Preenchimentos públicos
          {count > 0 ? (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {count}
            </Badge>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Preenchimentos públicos</DialogTitle>
          <DialogDescription>
            Registro de quem preencheu os checklists de {projectName} por link
            público.
          </DialogDescription>
        </DialogHeader>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum preenchimento público até o momento.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Cliente</th>
                  <th className="py-2 pr-4">E-mail</th>
                  <th className="py-2 pr-4">Formulário</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Enviado em</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => {
                  const tpl = templateById.get(s.template_id);
                  return (
                    <tr key={s.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {s.client_name ?? "—"}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {s.client_email ?? "—"}
                      </td>
                      <td className="py-2 pr-4">
                        {tpl?.name ?? (
                          <span className="text-muted-foreground">
                            (removido)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge
                          variant={
                            s.status === "submitted" ? "default" : "secondary"
                          }
                        >
                          {s.status === "submitted" ? "Enviado" : "Rascunho"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {formatDate(s.submitted_at ?? s.created_at)}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/submissions/${s.id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
