"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, User, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ClDesigner } from "@/lib/supabase/types";

import { setProjectDesigners } from "./actions";

interface Props {
  projectId: string;
  allDesigners: ClDesigner[];
  selectedIds: string[];
  publicBaseUrl: string;
}

export function ProjectDesignersPanel({
  projectId,
  allDesigners,
  selectedIds: initialSelected,
  publicBaseUrl,
}: Props) {
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [isPending, startTransition] = useTransition();

  const byId = new Map(allDesigners.map((d) => [d.id, d]));
  const available = allDesigners.filter((d) => !selected.includes(d.id));

  function resolvePhoto(path: string | null) {
    if (!path) return null;
    return `${publicBaseUrl}/${path}`;
  }

  function persist(next: string[]) {
    setSelected(next);
    startTransition(async () => {
      const res = await setProjectDesigners(projectId, next);
      if (res.error) {
        toast.error(res.error);
      }
    });
  }

  function addDesigner(id: string) {
    if (selected.includes(id)) return;
    persist([...selected, id]);
  }

  function removeDesigner(id: string) {
    persist(selected.filter((d) => d !== id));
  }

  function move(index: number, delta: number) {
    const next = [...selected];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    persist(next);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Projetistas do projeto</CardTitle>
          <p className="text-sm text-muted-foreground">
            Serão exibidos na capa do link público.
          </p>
        </div>
        {allDesigners.length === 0 ? (
          <Button asChild size="sm" variant="outline">
            <Link href="/settings/designers">Cadastrar projetistas</Link>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum projetista associado.
          </p>
        ) : (
          <div className="space-y-2">
            {selected.map((id, i) => {
              const d = byId.get(id);
              if (!d) return null;
              const photo = resolvePhoto(d.photo_url);
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-md border p-2"
                >
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
                      disabled={isPending || i === selected.length - 1}
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
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Gerenciar projetistas
            </Link>
          </div>
        ) : allDesigners.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Todos os projetistas cadastrados já foram adicionados.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
