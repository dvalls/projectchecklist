"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ArrowDown, ArrowUp, User, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ClDesigner } from "@/lib/supabase/types";

import { setProjectDesigners } from "../../[id]/actions";

interface Props {
  projectId: string;
  allDesigners: ClDesigner[];
  selectedIds: string[];
  publicBaseUrl: string;
  onChangeSelected: (ids: string[]) => void;
}

export function StepDesigners({
  projectId,
  allDesigners,
  selectedIds,
  publicBaseUrl,
  onChangeSelected,
}: Props) {
  const [isPending, startTransition] = useTransition();

  const byId = new Map(allDesigners.map((d) => [d.id, d]));
  const available = allDesigners.filter((d) => !selectedIds.includes(d.id));

  function resolvePhoto(path: string | null) {
    if (!path) return null;
    return `${publicBaseUrl}/${path}`;
  }

  function persist(next: string[]) {
    onChangeSelected(next);
    startTransition(async () => {
      const res = await setProjectDesigners(projectId, next);
      if (res.error) toast.error(res.error);
    });
  }

  function addDesigner(id: string) {
    if (selectedIds.includes(id)) return;
    persist([...selectedIds, id]);
  }

  function removeDesigner(id: string) {
    persist(selectedIds.filter((d) => d !== id));
  }

  function move(index: number, delta: number) {
    const next = [...selectedIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Projetistas</h2>
        <p className="text-sm text-muted-foreground">
          Quem aparece como responsável na capa do link público. Você pode pular e
          configurar depois.
        </p>
      </div>

      {allDesigners.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm">
          <p className="text-muted-foreground">Nenhum projetista cadastrado ainda.</p>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link href="/settings/designers" target="_blank">
              Cadastrar projetistas
            </Link>
          </Button>
        </div>
      ) : (
        <>
          {selectedIds.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum projetista associado.</p>
          ) : (
            <div className="space-y-2">
              {selectedIds.map((id, i) => {
                const d = byId.get(id);
                if (!d) return null;
                const photo = resolvePhoto(d.photo_url);
                return (
                  <div key={id} className="flex items-center gap-3 rounded-md border p-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border bg-muted">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={d.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.name}</div>
                      {d.role ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {d.role}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={isPending || i === 0}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={isPending || i === selectedIds.length - 1}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => removeDesigner(id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {available.length > 0 ? (
            <div className="flex items-center gap-2">
              <Select value="" onValueChange={(v) => v && addDesigner(v)}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Adicionar projetista..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.role ? ` — ${d.role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link
                href="/settings/designers"
                target="_blank"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Gerenciar
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Todos os projetistas cadastrados já foram adicionados.
            </p>
          )}
        </>
      )}
    </div>
  );
}
