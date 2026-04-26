"use client";

import { CheckCircle2, FileText, ImageIcon, User } from "lucide-react";

import type { ClDesigner } from "@/lib/supabase/types";

import type { AddedTemplate } from "./step-forms";

interface Props {
  name: string;
  description: string;
  imageUrl: string | null;
  publicBaseUrl: string;
  selectedDesigners: ClDesigner[];
  templates: AddedTemplate[];
  allowResubmit: boolean;
}

export function StepReview({
  name,
  description,
  imageUrl,
  publicBaseUrl,
  selectedDesigners,
  templates,
  allowResubmit,
}: Props) {
  const cover = imageUrl ? `${publicBaseUrl}/${imageUrl}` : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Revisar</h2>
        <p className="text-sm text-muted-foreground">
          Confirme os detalhes do novo projeto. Você poderá alterar tudo depois.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border">
        <div className="relative h-32 w-full bg-gradient-to-br from-primary/10 to-muted">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="Capa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="space-y-1 p-4">
          <div className="text-base font-semibold">{name || "(sem nome)"}</div>
          <div className="text-sm text-muted-foreground">
            {description || "Sem descrição"}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          icon={<User className="h-4 w-4" />}
          title="Projetistas"
          empty="Nenhum projetista associado."
          isEmpty={selectedDesigners.length === 0}
        >
          <ul className="space-y-1 text-sm">
            {selectedDesigners.map((d) => (
              <li key={d.id} className="truncate">
                {d.name}
                {d.role ? (
                  <span className="text-muted-foreground"> — {d.role}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </SummaryCard>

        <SummaryCard
          icon={<FileText className="h-4 w-4" />}
          title={`Formulários (${templates.length})`}
          empty="Nenhum formulário adicionado."
          isEmpty={templates.length === 0}
        >
          <ul className="space-y-1 text-sm">
            {templates.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {t.origin === "imported" ? "Importado" : "Novo"}
                </span>
              </li>
            ))}
          </ul>
        </SummaryCard>
      </div>

      <div className="rounded-md border p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2
            className={
              allowResubmit ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"
            }
          />
          Comportamento de reenvio
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {allowResubmit
            ? "Permitir novo preenchimento de itens já respondidos."
            : "Bloquear itens já respondidos no preenchimento público."}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  empty,
  isEmpty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  empty: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {isEmpty ? <p className="text-xs text-muted-foreground">{empty}</p> : children}
    </div>
  );
}
