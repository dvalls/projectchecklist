"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";

import { updateProjectAllowResubmit } from "../../[id]/actions";

interface Props {
  projectId: string;
  allow: boolean;
  onChangeAllow: (next: boolean) => void;
}

export function StepBehavior({ projectId, allow, onChangeAllow }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    const previous = allow;
    onChangeAllow(next);
    startTransition(async () => {
      const res = await updateProjectAllowResubmit(projectId, next);
      if (res.error) {
        onChangeAllow(previous);
        toast.error(res.error);
      } else {
        toast.success(
          next ? "Novo preenchimento permitido." : "Respostas herdadas serão bloqueadas.",
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Comportamento do preenchimento</h2>
        <p className="text-sm text-muted-foreground">
          Define como respostas anteriores se comportam quando um novo cliente abre o link
          público.
        </p>
      </div>
      <label
        htmlFor="wizard-allow-resubmit"
        className="flex items-start justify-between gap-4 rounded-md border p-4"
      >
        <div className="min-w-0 space-y-1">
          <div className="text-sm font-medium">
            Permitir novo preenchimento de itens já respondidos
          </div>
          <p className="text-xs text-muted-foreground">
            Quando desligado, os campos já preenchidos em submissões anteriores aparecem
            bloqueados (apenas leitura) para o próximo cliente, herdando o último valor.
            Quando ligado, o cliente pode sobrescrever os valores anteriores.
          </p>
        </div>
        <Switch
          id="wizard-allow-resubmit"
          checked={allow}
          disabled={isPending}
          onCheckedChange={handleToggle}
        />
      </label>
    </div>
  );
}
