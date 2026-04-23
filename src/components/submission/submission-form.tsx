"use client";

import { useState, useTransition } from "react";
import { Loader2, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

import { createClient } from "@/lib/supabase/client";
import type {
  ClFormField,
  ClFormTemplate,
  FieldOptions,
} from "@/lib/supabase/types";

import { createSubmission } from "@/app/(dashboard)/submissions/actions";

interface Props {
  template: ClFormTemplate;
  fields: ClFormField[];
  sequenceId?: string;
  stepId?: string;
}

type FieldValue = {
  value: string | null;
  image_url: string | null;
  image_uploading?: boolean;
};

const BUCKET = "checklist-images";

export function SubmissionForm({ template, fields, sequenceId, stepId }: Props) {
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.id,
        {
          value: f.type === "checkbox" ? "false" : null,
          image_url: null,
        },
      ]),
    ),
  );
  const [isSubmitting, startSubmitting] = useTransition();

  function setFieldValue(fieldId: string, patch: Partial<FieldValue>) {
    setValues((prev) => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], ...patch },
    }));
  }

  async function handleImageUpload(fieldId: string, file: File) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sessão expirada.");
      return;
    }

    setFieldValue(fieldId, { image_uploading: true });

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${template.id}/${fieldId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { upsert: false });

    if (error) {
      toast.error(`Erro no upload: ${error.message}`);
      setFieldValue(fieldId, { image_uploading: false });
      return;
    }

    setFieldValue(fieldId, { image_url: path, image_uploading: false });
    toast.success("Imagem enviada.");
  }

  async function removeImage(fieldId: string) {
    const current = values[fieldId];
    if (!current?.image_url) return;
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([current.image_url]);
    setFieldValue(fieldId, { image_url: null });
  }

  function handleSubmit(asDraft: boolean) {
    for (const f of fields) {
      if (!f.required) continue;
      const v = values[f.id];
      if (f.type === "image") {
        if (!v?.image_url && !asDraft) {
          toast.error(`${f.label}: imagem obrigatória.`);
          return;
        }
      } else if (f.type === "checkbox") {
        if (v?.value !== "true" && !asDraft) {
          toast.error(`${f.label}: obrigatório.`);
          return;
        }
      } else {
        if (!v?.value && !asDraft) {
          toast.error(`${f.label}: obrigatório.`);
          return;
        }
      }
    }

    startSubmitting(async () => {
      const payload = fields.map((f) => ({
        field_id: f.id,
        value: values[f.id]?.value ?? null,
        image_url: values[f.id]?.image_url ?? null,
      }));

      const res = await createSubmission({
        template_id: template.id,
        project_id: template.project_id,
        sequence_id: sequenceId ?? null,
        step_id: stepId ?? null,
        values: payload,
        asDraft,
      });

      if (res?.error) {
        toast.error(res.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.name}</CardTitle>
        {template.description ? (
          <p className="text-sm text-muted-foreground">
            {template.description}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este formulário não possui campos.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {fields.map((field) => (
              <div
                key={field.id}
                style={{ gridColumn: `span ${field.column_span}` }}
              >
                <FieldInput
                  field={field}
                  value={values[field.id]}
                  onChange={(patch) => setFieldValue(field.id, patch)}
                  onUpload={(file) => handleImageUpload(field.id, file)}
                  onRemoveImage={() => removeImage(field.id)}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
          >
            Salvar rascunho
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={isSubmitting}>
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  onUpload,
  onRemoveImage,
}: {
  field: ClFormField;
  value: FieldValue | undefined;
  onChange: (patch: Partial<FieldValue>) => void;
  onUpload: (file: File) => void;
  onRemoveImage: () => void;
}) {
  const choices =
    (field.options as Exclude<FieldOptions, null>)?.choices ?? [];

  return (
    <div className="space-y-1.5">
      <Label>
        {field.label}
        {field.required ? (
          <span className="ml-1 text-destructive-foreground">*</span>
        ) : null}
      </Label>
      {field.help_text ? (
        <p className="text-xs text-muted-foreground">{field.help_text}</p>
      ) : null}

      {field.type === "text" ? (
        <Input
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "number" ? (
        <Input
          type="number"
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "textarea" ? (
        <Textarea
          rows={3}
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "date" ? (
        <Input
          type="date"
          value={value?.value ?? ""}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      ) : null}

      {field.type === "checkbox" ? (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            checked={value?.value === "true"}
            onCheckedChange={(checked) =>
              onChange({ value: checked ? "true" : "false" })
            }
          />
          <span className="text-sm">{field.label}</span>
        </div>
      ) : null}

      {field.type === "select" ? (
        <Select
          value={value?.value ?? ""}
          onValueChange={(v) => onChange({ value: v })}
        >
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
          {choices.map((c) => (
            <label
              key={c.value}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="radio"
                name={field.id}
                checked={value?.value === c.value}
                onChange={() => onChange({ value: c.value })}
              />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}

      {field.type === "image" ? (
        <div>
          {value?.image_url ? (
            <div className="relative inline-flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs">
              <span className="max-w-[220px] truncate">
                {value.image_url.split("/").pop()}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemoveImage}
                className="h-6 w-6"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed bg-muted/40 text-xs text-muted-foreground hover:bg-muted/60">
              {value?.image_uploading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Clique para enviar imagem
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload(file);
                }}
              />
            </label>
          )}
        </div>
      ) : null}
    </div>
  );
}
