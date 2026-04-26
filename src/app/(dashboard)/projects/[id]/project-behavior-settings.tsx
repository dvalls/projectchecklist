"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import { updateProjectAllowResubmit } from "./actions";

interface Props {
  projectId: string;
  initialAllow: boolean;
}

export function ProjectBehaviorSettings({ projectId, initialAllow }: Props) {
  const [allow, setAllow] = useState(initialAllow);
  const [isPending, startTransition] = useTransition();

  function handleToggle(next: boolean) {
    const previous = allow;
    setAllow(next);
    startTransition(async () => {
      const res = await updateProjectAllowResubmit(projectId, next);
      if (res.error) {
        setAllow(previous);
        toast.error(res.error);
      } else {
        toast.success(
          next ? "Novo preenchimento permitido." : "Respostas herdadas serão bloqueadas.",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comportamento do preenchimento público</CardTitle>
        <p className="text-sm text-muted-foreground">
          Define como os itens já respondidos em preenchimentos anteriores aparecem para
          novos clientes no link de envio.
        </p>
      </CardHeader>
      <CardContent>
        <label
          htmlFor="allow_resubmit"
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
            id="allow_resubmit"
            checked={allow}
            disabled={isPending}
            onCheckedChange={handleToggle}
          />
        </label>
      </CardContent>
    </Card>
  );
}
