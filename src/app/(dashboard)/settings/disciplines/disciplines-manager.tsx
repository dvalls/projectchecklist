"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/layout/empty-state";

import type { ClDiscipline } from "@/lib/supabase/types";

import {
  createDiscipline,
  deleteDiscipline,
  updateDiscipline,
} from "./actions";

const PALETTE = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
  "#0f172a",
  "#eab308",
];

interface Props {
  initialDisciplines: ClDiscipline[];
}

export function DisciplinesManager({ initialDisciplines }: Props) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ClDiscipline | null>(null);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova disciplina
        </Button>
      </div>

      {initialDisciplines.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid className="h-6 w-6" />}
          title="Nenhuma disciplina"
          description="Crie disciplinas globais para agrupar os formulários dos seus projetos."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialDisciplines.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <div className="flex-1 truncate font-medium">{d.name}</div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => setEditing(d)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <DeleteButton discipline={d} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {creating ? (
        <DisciplineDialog onClose={() => setCreating(false)} />
      ) : null}

      {editing ? (
        <DisciplineDialog
          discipline={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function DeleteButton({ discipline }: { discipline: ClDiscipline }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm(`Remover a disciplina "${discipline.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteDiscipline(discipline.id);
      if (res.error) toast.error(res.error);
      else toast.success("Disciplina removida.");
    });
  }

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      onClick={handleDelete}
      disabled={isPending}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

function DisciplineDialog({
  discipline,
  onClose,
}: {
  discipline?: ClDiscipline;
  onClose: () => void;
}) {
  const [name, setName] = useState(discipline?.name ?? "");
  const [color, setColor] = useState(discipline?.color ?? PALETTE[0]);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = discipline
        ? await updateDiscipline(discipline.id, { name, color })
        : await createDiscipline({ name, color });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(discipline ? "Disciplina atualizada." : "Disciplina criada.");
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {discipline ? "Editar disciplina" : "Nova disciplina"}
          </DialogTitle>
          <DialogDescription>
            Disciplinas agrupam formulários por área (ex: Arquitetura,
            Estrutural, Elétrica). Elas são compartilhadas entre todos os
            projetos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="discipline-name">Nome</Label>
            <Input
              id="discipline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arquitetura"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    borderColor:
                      c === color ? "hsl(var(--foreground))" : "transparent",
                  }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
