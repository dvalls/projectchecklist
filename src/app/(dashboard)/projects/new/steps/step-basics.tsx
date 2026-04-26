"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  name: string;
  description: string;
  onChangeName: (value: string) => void;
  onChangeDescription: (value: string) => void;
}

export function StepBasics({
  name,
  description,
  onChangeName,
  onChangeDescription,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Informações básicas</h2>
        <p className="text-sm text-muted-foreground">
          Comece dando um nome e uma descrição para o projeto.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-name">
          Nome <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wizard-name"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Ex: Edifício Central"
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wizard-description">Descrição</Label>
        <Textarea
          id="wizard-description"
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Descrição opcional do projeto"
          rows={4}
        />
      </div>
    </div>
  );
}
