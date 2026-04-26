"use client";

import { useState, useTransition } from "react";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createClient } from "@/lib/supabase/client";

import { updateProjectCover } from "./actions";

const BUCKET = "checklist-images";

interface Props {
  projectId: string;
  initialImageUrl: string | null;
  publicBaseUrl: string;
}

export function ProjectCoverSettings({
  projectId,
  initialImageUrl,
  publicBaseUrl,
}: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const preview = imageUrl ? `${publicBaseUrl}/${imageUrl}` : null;

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
    const path = `${user.id}/projects/${projectId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      setUploading(false);
      return;
    }

    startTransition(async () => {
      const res = await updateProjectCover(projectId, path);
      if (res.error) {
        toast.error(res.error);
      } else {
        setImageUrl(path);
        toast.success("Capa atualizada.");
      }
      setUploading(false);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await updateProjectCover(projectId, null);
      if (res.error) toast.error(res.error);
      else {
        setImageUrl(null);
        toast.success("Capa removida.");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Imagem de capa do projeto</CardTitle>
        <p className="text-sm text-muted-foreground">
          Aparece na capa do checklist enviado.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="relative h-40 w-full overflow-hidden rounded-md border bg-muted sm:w-64">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Capa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent">
            {uploading || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? "Enviando..." : "Enviar imagem"}
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
          {imageUrl ? (
            <Button variant="ghost" size="sm" onClick={handleRemove} disabled={isPending}>
              <X className="mr-1 h-3.5 w-3.5" />
              Remover capa
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
