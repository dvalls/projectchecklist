"use client";

import { CalendarIcon, Image as ImageIcon } from "lucide-react";

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

import type { ClFormField, FieldOptions } from "@/lib/supabase/types";

export function FieldPreview({ field }: { field: ClFormField }) {
  const choices =
    (field.options as Exclude<FieldOptions, null>)?.choices ?? [];

  return (
    <div className="space-y-1.5">
      <Label>
        {field.label || "(sem label)"}
        {field.required ? (
          <span className="ml-1 text-destructive-foreground">*</span>
        ) : null}
      </Label>
      {field.help_text ? (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      ) : null}

      {field.type === "text" ? (
        <Input placeholder="Texto curto" disabled />
      ) : null}
      {field.type === "number" ? (
        <Input type="number" placeholder="0" disabled />
      ) : null}
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
        <div className="flex items-center gap-2 pt-1">
          <Checkbox disabled />
          <span className="text-sm text-muted-foreground">
            {field.label || "Marcar"}
          </span>
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
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      {field.type === "radio" ? (
        <div className="space-y-1.5 pt-1">
          {choices.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              (adicione opções)
            </p>
          ) : (
            choices.map((c) => (
              <label
                key={c.value}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <input type="radio" disabled />
                {c.label}
              </label>
            ))
          )}
        </div>
      ) : null}
      {field.type === "image" ? (
        <div className="flex h-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/40 text-xs text-muted-foreground">
          <ImageIcon className="h-6 w-6" />
          Upload de imagem
        </div>
      ) : null}
    </div>
  );
}
