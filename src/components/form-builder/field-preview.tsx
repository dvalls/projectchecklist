"use client";

import { CalendarIcon, EyeOff, Image as ImageIcon, Info } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { getTemplateAssetPublicUrl } from "@/lib/storage/template-assets";
import type { ClFormField, FieldOptions } from "@/lib/supabase/types";

import { ChoiceLabel, RecommendedBadge } from "./shared";

function InfoBlock({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const isAllBullets = lines.length > 0 && lines.every((l) => l.trim().startsWith("- "));
  if (isAllBullets) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
        {lines.map((l, i) => (
          <li key={i}>{l.replace(/^-\s*/, "")}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="whitespace-pre-wrap text-xs italic text-muted-foreground">{content}</p>
  );
}

export function FieldPreview({
  field,
  hidden,
}: {
  field: ClFormField;
  hidden?: boolean;
}) {
  const opts = (field.options as Exclude<FieldOptions, null>) ?? {};
  const choices = opts.choices ?? [];

  if (field.type === "info") {
    return (
      <div className="rounded-md border border-dashed bg-muted/20 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Info className="h-3.5 w-3.5" />
          {field.label || "Informação"}
        </div>
        <InfoBlock content={opts.content ?? field.help_text ?? ""} />
      </div>
    );
  }

  if (field.type === "image") {
    return (
      <ImageDisplayField
        label={field.label}
        imageUrl={opts.image_url ?? null}
        caption={opts.image_caption ?? null}
        link={opts.image_link ?? null}
        hidden={hidden}
      />
    );
  }

  return (
    <div className={`space-y-1.5 ${hidden ? "opacity-60" : ""}`}>
      {field.type !== "checkbox" ? (
        <>
          <div className="flex items-center gap-2">
            <Label>
              {field.label || "(sem label)"}
              {field.required ? (
                <span className="ml-1 text-destructive-foreground">*</span>
              ) : null}
            </Label>
            {hidden ? (
              <span
                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title="Oculto até condição"
              >
                <EyeOff className="h-3 w-3" /> condicional
              </span>
            ) : null}
          </div>
          {field.help_text ? (
            <p className="text-xs italic text-muted-foreground">{field.help_text}</p>
          ) : null}
        </>
      ) : null}

      {field.type === "text" ? <Input placeholder="Texto curto" disabled /> : null}
      {field.type === "number" ? <Input type="number" placeholder="0" disabled /> : null}
      {field.type === "textarea" ? (
        <Textarea placeholder="Texto longo" rows={3} disabled />
      ) : null}
      {field.type === "date" ? (
        <div className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
          <CalendarIcon className="h-4 w-4" />
          dd/mm/aaaa
        </div>
      ) : null}
      {field.type === "checkbox" ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Checkbox disabled />
            <span className="text-sm text-muted-foreground">
              {field.label || "Marcar"}
              {field.required ? (
                <span className="ml-1 text-destructive-foreground">*</span>
              ) : null}
            </span>
            {hidden ? (
              <span
                className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                title="Oculto até condição"
              >
                <EyeOff className="h-3 w-3" /> condicional
              </span>
            ) : null}
            {opts.recommended_value ? <RecommendedBadge /> : null}
          </div>
          {field.help_text ? (
            <p className="pl-6 text-xs italic text-muted-foreground">{field.help_text}</p>
          ) : null}
          {opts.recommended_value ? (
            <p className="pl-6 text-[11px] text-warning-foreground">
              StudioBIM recomenda:{" "}
              <strong>{opts.recommended_value === "true" ? "Sim" : "Não"}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
      {field.type === "checkbox_group" ? (
        <div className="space-y-1.5 pt-1">
          {choices.length === 0 ? (
            <p className="text-xs text-muted-foreground">(adicione opções)</p>
          ) : (
            choices.map((c) => (
              <label
                key={c.value}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Checkbox disabled />
                <ChoiceLabel label={c.label} recommended={c.recommended} />
              </label>
            ))
          )}
          {opts.allow_other ? (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox disabled />
              Outra:
              <Input className="h-7 flex-1" placeholder="" disabled />
            </label>
          ) : null}
        </div>
      ) : null}
      {field.type === "select" ? (
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {choices.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <ChoiceLabel label={c.label} recommended={c.recommended} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {field.type === "radio" ? (
        <div className="space-y-1.5 pt-1">
          {choices.length === 0 ? (
            <p className="text-xs text-muted-foreground">(adicione opções)</p>
          ) : (
            choices.map((c) => (
              <label
                key={c.value}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <input type="radio" disabled />
                <ChoiceLabel label={c.label} recommended={c.recommended} />
              </label>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function ImageDisplayField({
  label,
  imageUrl,
  caption,
  link,
  hidden,
}: {
  label: string | null | undefined;
  imageUrl: string | null;
  caption: string | null;
  link: string | null;
  hidden?: boolean;
}) {
  const publicUrl = getTemplateAssetPublicUrl(imageUrl);
  const href = link && link.trim() ? link.trim() : (publicUrl ?? null);

  return (
    <figure className={`space-y-1.5 ${hidden ? "opacity-60" : ""}`}>
      {label ? (
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      ) : null}
      {publicUrl ? (
        href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-md border bg-muted/20"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl}
              alt={caption ?? label ?? "Imagem do formulário"}
              className="h-auto w-full object-contain"
            />
          </a>
        ) : (
          <div className="overflow-hidden rounded-md border bg-muted/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicUrl}
              alt={caption ?? label ?? "Imagem do formulário"}
              className="h-auto w-full object-contain"
            />
          </div>
        )
      ) : (
        <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/40 text-xs text-muted-foreground">
          <ImageIcon className="h-6 w-6" />
          Nenhuma imagem selecionada
        </div>
      )}
      {caption ? (
        <figcaption className="text-xs italic text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
