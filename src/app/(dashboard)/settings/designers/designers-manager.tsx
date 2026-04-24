"use client";

import { useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2, Upload, User, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/layout/empty-state";

import { createClient } from "@/lib/supabase/client";
import type { ClDesigner } from "@/lib/supabase/types";

import { createDesigner, deleteDesigner, updateDesigner } from "./actions";

const BUCKET = "checklist-images";

interface Props {
  initialDesigners: ClDesigner[];
  publicBaseUrl: string;
}

export function DesignersManager({ initialDesigners, publicBaseUrl }: Props) {
  const [editing, setEditing] = useState<ClDesigner | null>(null);
  const [creating, setCreating] = useState(false);

  function resolvePhoto(path: string | null) {
    if (!path) return null;
    return `${publicBaseUrl}/${path}`;
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo projetista
        </Button>
      </div>

      {initialDesigners.length === 0 ? (
        <EmptyState
          icon={<User className="h-6 w-6" />}
          title="Nenhum projetista cadastrado"
          description="Cadastre projetistas aqui para exibi-los em qualquer projeto."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialDesigners.map((d) => {
            const photo = resolvePhoto(d.photo_url);
            return (
              <Card key={d.id}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border bg-muted">
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
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{d.name}</div>
                    {d.role ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {d.role}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditing(d)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <DeleteButton designer={d} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {creating ? (
        <DesignerDialog
          onClose={() => setCreating(false)}
          publicBaseUrl={publicBaseUrl}
        />
      ) : null}

      {editing ? (
        <DesignerDialog
          designer={editing}
          onClose={() => setEditing(null)}
          publicBaseUrl={publicBaseUrl}
        />
      ) : null}
    </>
  );
}

function DeleteButton({ designer }: { designer: ClDesigner }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover o projetista "${designer.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteDesigner(designer.id);
      if (res.error) toast.error(res.error);
      else toast.success("Projetista removido.");
    });
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function DesignerDialog({
  designer,
  onClose,
  publicBaseUrl,
}: {
  designer?: ClDesigner;
  onClose: () => void;
  publicBaseUrl: string;
}) {
  const [name, setName] = useState(designer?.name ?? "");
  const [role, setRole] = useState(designer?.role ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    designer?.photo_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleUpload(file: File) {
    setUploading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada.");
      setUploading(false);
      return;
    }

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/designers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      setUploading(false);
      return;
    }
    setPhotoUrl(path);
    setUploading(false);
  }

  function handleSave() {
    startTransition(async () => {
      const input = {
        name,
        role: role || null,
        photo_url: photoUrl,
      };
      const res = designer
        ? await updateDesigner(designer.id, input)
        : await createDesigner(input);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(designer ? "Projetista atualizado." : "Projetista criado.");
      onClose();
    });
  }

  const photoPreview = photoUrl ? `${publicBaseUrl}/${photoUrl}` : null;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {designer ? "Editar projetista" : "Novo projetista"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-muted">
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoPreview}
                  alt="Foto"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Enviando..." : "Enviar foto"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file);
                  }}
                />
              </label>
              {photoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhotoUrl(null)}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Remover
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="designer-name">Nome</Label>
            <Input
              id="designer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="designer-role">Cargo (opcional)</Label>
            <Input
              id="designer-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Ex: Engenheiro Eletricista"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
