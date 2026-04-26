"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Clock, ImageIcon, Play, Trash2, User } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

import { formatDateTime, getInitials } from "@/lib/format";
import { identityIdentificationSchema } from "@/lib/schemas/public-link";
import type { ClDesigner, ClDiscipline, ClProject } from "@/lib/supabase/types";

import { deletePublicSubmission } from "./actions";
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
  isProjectOwner: boolean;
}

function initials(name: string | null, email: string | null) {
  return getInitials(name, email);
}

export function PublicCover({
  token,
  project,
  designers,
  disciplines: _disciplines,
  formCount,
  publicBaseUrl,
  history,
  officeSettings,
  isProjectOwner,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    const saved = readIdentity(token);
    if (saved) {
      setClientName(saved.client_name);
      setClientEmail(saved.client_email);
    }
  }, [token]);

  const coverUrl = project.image_url ? `${publicBaseUrl}/${project.image_url}` : null;

  const officeLogoUrl = officeSettings?.logo_url
    ? `${publicBaseUrl}/${officeSettings.logo_url}`
    : null;
  const officeName = officeSettings?.office_name ?? null;

  function handleDeleteConfirm() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    startDeleting(async () => {
      const res = await deletePublicSubmission(token, id);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Preenchimento excluído.");
        router.refresh();
      }
    });
  }

  function handleStart() {
    const saved = readIdentity(token);
    if (saved) {
      router.push(`/p/${token}/forms`);
      return;
    }
    setOpen(true);
  }

  function handleConfirm() {
    const parsed = identityIdentificationSchema.safeParse({
      client_name: clientName,
      client_email: clientEmail,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    writeIdentity(token, parsed.data);
    setOpen(false);
    router.push(`/p/${token}/forms`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-primary/20 to-muted sm:h-72">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={project.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-16 w-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-4 py-5 text-white sm:px-6 sm:py-6">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs uppercase tracking-wider text-white/80">
              Checklist do projeto
            </p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-4xl">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-white/90 sm:line-clamp-none">
                {project.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          {designers.length > 0 ? (
            <section className="pt-0 sm:mt-[40px]">
              {officeLogoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={officeLogoUrl}
                  alt={officeName ?? "Logo"}
                  className="mb-6 h-8 max-w-full object-contain sm:mb-[47px] sm:mt-[47px]"
                />
              )}
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Projetistas
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {designers.map((d) => {
                  const photo = d.photo_url ? `${publicBaseUrl}/${d.photo_url}` : null;
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

          <section className="mb-8 rounded-lg border bg-background p-4 shadow-sm sm:p-6">
            <div className="mt-2 flex justify-stretch sm:mt-4 sm:justify-end">
              <Button
                size="lg"
                onClick={handleStart}
                disabled={formCount === 0}
                className="group w-full animate-glow-pulse transition-all duration-200 hover:scale-105 active:scale-95 sm:w-auto"
              >
                <Play className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                Iniciar preenchimento
              </Button>
            </div>
          </section>

          {history.length > 0 ? (
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-foreground">
                  <Clock className="h-4 w-4" />
                  Histórico de preenchimentos
                </h2>
                <DownloadFullReportButton token={token} projectName={project.name} />
              </div>
              <div className="divide-y overflow-hidden rounded-lg border bg-background shadow-sm">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
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
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                      <PublicSubmissionSummaryDialog
                        token={token}
                        submissionId={item.id}
                        clientName={item.client_name}
                        templateName={item.template_name}
                        projectName={project.name}
                      />
                      {isProjectOwner ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(item.id)}
                          disabled={isDeleting}
                          aria-label="Excluir preenchimento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>

      <PublicFooter officeSettings={officeSettings} />

      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(o) => {
          if (!o) setConfirmDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir preenchimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O preenchimento e todas as respostas serão
              removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Identifique-se para continuar</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seus dados serão usados apenas para registrar quem preencheu os checklists
              deste projeto.
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
