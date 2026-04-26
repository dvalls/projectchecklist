"use client";

import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TEMPLATE_ASSETS_BUCKET,
  getTemplateAssetPublicUrl,
} from "@/lib/storage/template-assets";
import { createClient } from "@/lib/supabase/client";

interface PhotoHintEditorProps {
  templateId: string;
  scopeKey: string;
  imageUrl: string | null;
  caption: string;
  onChangeImageUrl: (url: string | null) => void;
  onChangeCaption: (value: string) => void;
  layout?: "default" | "compact";
  captionPlaceholder?: string;
}

export function PhotoHintEditor({
  templateId,
  scopeKey,
  imageUrl,
  caption,
  onChangeImageUrl,
  onChangeCaption,
  layout = "default",
  captionPlaceholder,
}: PhotoHintEditorProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const publicUrl = getTemplateAssetPublicUrl(imageUrl);

  async function handleUpload(file: File) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada.");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${templateId}/${scopeKey}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(TEMPLATE_ASSETS_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    setUploading(false);

    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      return;
    }

    if (imageUrl && imageUrl !== path) {
      await supabase.storage.from(TEMPLATE_ASSETS_BUCKET).remove([imageUrl]);
    }

    onChangeImageUrl(path);
    toast.success("Imagem enviada. Salve o formulário para confirmar.");
  }

  async function handleRemove() {
    if (!imageUrl) return;
    const supabase = createClient();
    await supabase.storage.from(TEMPLATE_ASSETS_BUCKET).remove([imageUrl]);
    onChangeImageUrl(null);
  }

  const isCompact = layout === "compact";

  return (
    <div className={isCompact ? "space-y-2" : "space-y-3"}>
      <div className={isCompact ? "space-y-1" : "space-y-1.5"}>
        {!isCompact ? <Label className="text-xs">Imagem</Label> : null}
        {publicUrl ? (
          <div
            className={
              isCompact
                ? "flex items-start gap-2"
                : "flex flex-col gap-2 sm:flex-row sm:items-start"
            }
          >
            <div className="relative shrink-0 overflow-hidden rounded-md border bg-muted/30">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={publicUrl}
                alt={caption || "Imagem de apoio"}
                className={
                  isCompact ? "h-16 w-24 object-cover" : "h-24 w-36 object-cover"
                }
              />
            </div>
            <div className={isCompact ? "flex flex-col gap-1" : "flex flex-col gap-1.5"}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={isCompact ? "h-7" : ""}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Trocar
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={uploading}
                className={
                  isCompact
                    ? "h-7 text-destructive-foreground"
                    : "text-destructive-foreground"
                }
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remover
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={
              isCompact
                ? "flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted/40 px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                : "flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/40 text-xs text-muted-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            {uploading ? (
              <>
                <Loader2
                  className={
                    isCompact ? "h-3.5 w-3.5 animate-spin" : "h-5 w-5 animate-spin"
                  }
                />
                Enviando…
              </>
            ) : (
              <>
                <Upload className={isCompact ? "h-3.5 w-3.5" : "h-5 w-5"} />
                {isCompact ? "Anexar foto" : "Clique para enviar uma imagem"}
              </>
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className={isCompact ? "space-y-1" : "space-y-1.5"}>
        {!isCompact ? <Label className="text-xs">Legenda (opcional)</Label> : null}
        <Input
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          placeholder={
            captionPlaceholder ??
            (isCompact ? "Legenda (opcional)" : "Ex.: Vista frontal do bloco A")
          }
          className={isCompact ? "h-7 text-xs" : ""}
        />
      </div>
    </div>
  );
}
