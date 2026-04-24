"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Clock,
  ImageIcon,
  Play,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { getDisciplineIcon } from "@/lib/disciplines/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type {
  ClDesigner,
  ClDiscipline,
  ClProject,
} from "@/lib/supabase/types";

import { readIdentity, writeIdentity } from "./identity-storage";
import { DownloadFullReportButton } from "./pdf/download-buttons";
import { PublicFooter, type PublicOfficeSettings } from "./public-footer";
import { PublicSubmissionSummaryDialog } from "./public-submission-summary-dialog";

export interface PublicSubmissionHistoryItem {
  id: string;
  template_id: string;
  template_name: string;
  client_name: string | null;
  client_email: string | null;
  submitted_at: string;
}

interface Props {
  token: string;
  project: ClProject;
  designers: ClDesigner[];
  disciplines: ClDiscipline[];
  formCount: number;
  publicBaseUrl: string;
  history: PublicSubmissionHistoryItem[];
  officeSettings: PublicOfficeSettings | null;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function initials(name: string | null, email: string | null) {
  const source = (name ?? email ?? "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function PublicCover({
  token,
  project,
  designers,
  disciplines,
  formCount,
  publicBaseUrl,
  history,
  officeSettings,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    const saved = readIdentity(token);
    if (saved) {
      setClientName(saved.client_name);
      setClientEmail(saved.client_email);
    }
  }, [token]);

  const coverUrl = project.image_url
    ? `${publicBaseUrl}/${project.image_url}`
    : null;

  const officeLogoUrl = officeSettings?.logo_url
    ? `${publicBaseUrl}/${officeSettings.logo_url}`
    : null;
  const officeName = officeSettings?.office_name ?? null;

  function handleStart() {
    const saved = readIdentity(token);
    if (saved) {
      router.push(`/p/${token}/forms`);
      return;
    }
    setOpen(true);
  }

  function handleConfirm() {
    if (!clientName.trim()) {
      toast.error("Informe o seu nome.");
      return;
    }
    const email = clientEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      toast.error("E-mail inválido.");
      return;
    }
    writeIdentity(token, {
      client_name: clientName.trim(),
      client_email: email,
    });
    setOpen(false);
    router.push(`/p/${token}/forms`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="relative h-72 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-muted">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt={project.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 py-6 text-white">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs uppercase tracking-wider text-white/80">
              Checklist do projeto
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-2 max-w-2xl text-sm text-white/90">
                {project.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
        {designers.length > 0 ? (
          <section className="pt-0 mt-[40px]">
            {officeLogoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={officeLogoUrl}
                alt={officeName ?? "Logo"}
                className="mt-[47px] mb-[47px] h-8 w-auto object-contain"
              />
            )}
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Projetistas
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {designers.map((d) => {
                const photo = d.photo_url
                  ? `${publicBaseUrl}/${d.photo_url}`
                  : null;
                return (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg border bg-background p-3 shadow-sm"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border bg-muted">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={d.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <User className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{d.name}</div>
                      {d.role ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {d.role}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {disciplines.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Disciplinas
            </h2>
            <div className="flex flex-wrap gap-3">
              {disciplines.map((d) => {
                const Icon = getDisciplineIcon(d.name);
                return (
                  <div
                    key={d.id}
                    className="flex flex-col items-center gap-2 rounded-xl border bg-background px-5 py-4 text-sm font-medium shadow-sm min-w-[80px]"
                  >
                    <Icon
                      className="h-6 w-6"
                      style={{ color: d.color }}
                      aria-hidden
                    />
                    {d.name}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="rounded-lg border bg-background p-6 shadow-sm mb-8">
          <div className="mt-4 flex justify-end">
            <Button
              size="lg"
              onClick={handleStart}
              disabled={formCount === 0}
              className="group animate-glow-pulse transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Play className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              Iniciar preenchimento
            </Button>
          </div>
        </section>

        {history.length > 0 ? (
          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Clock className="h-4 w-4" />
                Histórico de preenchimentos
              </h2>
              <DownloadFullReportButton
                token={token}
                projectName={project.name}
              />
            </div>
            <div className="divide-y overflow-hidden rounded-lg border bg-background shadow-sm">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(item.client_name, item.client_email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {item.client_name ?? item.client_email ?? "Anônimo"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.template_name}
                      {" · "}
                      {formatDateTime(item.submitted_at)}
                    </div>
                  </div>
                  <PublicSubmissionSummaryDialog
                    token={token}
                    submissionId={item.id}
                    clientName={item.client_name}
                    templateName={item.template_name}
                    projectName={project.name}
                  />
                </div>
              ))}
            </div>
          </section>
        ) : null}
        </div>
      </div>

      <PublicFooter officeSettings={officeSettings} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identifique-se para continuar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seus dados serão usados apenas para registrar quem preencheu os
              checklists deste projeto.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="cover_client_name">Nome completo</Label>
              <Input
                id="cover_client_name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Seu nome"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover_client_email">E-mail</Label>
              <Input
                id="cover_client_email"
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
