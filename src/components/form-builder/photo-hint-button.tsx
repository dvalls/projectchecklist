"use client";

import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTemplateAssetPublicUrl } from "@/lib/storage/template-assets";
import { cn } from "@/lib/utils";

interface PhotoHintButtonProps {
  imagePath: string | null | undefined;
  caption?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function PhotoHintButton({
  imagePath,
  caption,
  alt,
  size = "sm",
  className,
}: PhotoHintButtonProps) {
  const [open, setOpen] = useState(false);
  const publicUrl = getTemplateAssetPublicUrl(imagePath ?? null);
  if (!publicUrl) return null;

  const iconClass = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const buttonClass = size === "xs" ? "h-5 w-5" : size === "md" ? "h-7 w-7" : "h-6 w-6";

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted hover:text-foreground",
          buttonClass,
          className,
        )}
        aria-label={alt ? `Ver foto: ${alt}` : "Ver foto"}
        title="Ver foto"
      >
        <ImageIcon className={iconClass} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="pr-8">{alt || "Imagem de apoio"}</DialogTitle>
          </DialogHeader>
          <div className="-mx-4 overflow-hidden rounded-md border bg-muted/20 sm:-mx-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl}
              alt={alt || "Imagem de apoio"}
              className="block max-h-[70vh] w-full object-contain"
            />
          </div>
          {caption ? (
            <p className="text-xs italic text-muted-foreground">{caption}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
