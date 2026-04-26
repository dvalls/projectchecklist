"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteTemplate,
  duplicateTemplate,
  renameTemplate,
} from "@/app/(dashboard)/templates/[id]/actions";

interface TemplateCardProps {
  id: string;
  name: string;
  projectId: string;
  projectName: string | null;
  discipline: { name: string; color: string } | null;
}

export function TemplateCard({
  id,
  name,
  projectId,
  projectName,
  discipline,
}: TemplateCardProps) {
  const router = useRouter();

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isRenaming, startRenaming] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isDuplicating, startDuplicating] = useTransition();

  function handleRename() {
    if (!renameValue.trim()) return;
    startRenaming(async () => {
      const res = await renameTemplate(id, renameValue.trim());
      if (res?.error) {
        toast.error(res.error);
      } else {
        setRenameOpen(false);
        toast.success("Formulário renomeado.");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    startDeleting(async () => {
      const res = await deleteTemplate(id, projectId);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setDeleteOpen(false);
        toast.success("Formulário apagado.");
        router.refresh();
      }
    });
  }

  function handleDuplicate() {
    startDuplicating(async () => {
      const res = await duplicateTemplate(id);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Formulário duplicado.");
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="group relative">
        <Link href={`/templates/${id}`} className="block">
          <Card className="h-full overflow-hidden transition-colors hover:border-primary/40">
            {discipline && (
              <div
                className="px-4 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: `${discipline.color}22`,
                  color: discipline.color,
                }}
              >
                {discipline.name}
              </div>
            )}
            <CardHeader className="pb-4 pr-10">
              <CardTitle className="line-clamp-1 text-base">{name}</CardTitle>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {projectName ?? "—"}
              </p>
            </CardHeader>
          </Card>
        </Link>

        <div className="absolute right-2 top-2" onClick={(e) => e.preventDefault()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                disabled={isDuplicating}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Opções</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem
                onClick={() => {
                  setRenameValue(name);
                  setRenameOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                <Copy className="mr-2 h-4 w-4" />
                {isDuplicating ? "Duplicando…" : "Duplicar"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Apagar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Renomear formulário</DialogTitle>
            <DialogDescription>
              Informe o novo nome para este formulário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Novo nome</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Nome do formulário"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRenameOpen(false)}
                disabled={isRenaming}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleRename}
                disabled={isRenaming || !renameValue.trim()}
              >
                {isRenaming ? "Salvando…" : "Renomear"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apagar formulário?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente e não pode ser desfeita. Todos os campos e seções
              serão removidos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Apagando…" : "Apagar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
