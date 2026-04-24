"use client";

import { useState, useTransition } from "react";
import { LayoutGrid, Pencil, Plus, Trash2, Check } from "lucide-react";
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
  DISCIPLINE_ICONS,
  resolveDisciplineIcon,
} from "@/lib/disciplines/icon";

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
            <DisciplineCard
              key={d.id}
              discipline={d}
              onEdit={() => setEditing(d)}
            />
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

function DisciplineCard({
  discipline,
  onEdit,
}: {
  discipline: ClDiscipline;
  onEdit: () => void;
}) {
  const Icon = resolveDisciplineIcon(discipline.icon, discipline.name);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${discipline.color}20`, color: discipline.color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="flex-1 truncate font-medium">{discipline.name}</div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <DeleteButton discipline={discipline} />
      </CardContent>
    </Card>
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
  const [icon, setIcon] = useState<string | null>(discipline?.icon ?? null);
  const [isPending, startTransition] = useTransition();

  const PreviewIcon = resolveDisciplineIcon(icon, name || discipline?.name);

  function handleSave() {
    startTransition(async () => {
      const res = discipline
        ? await updateDiscipline(discipline.id, { name, color, icon })
        : await createDiscipline({ name, color, icon });
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
      <DialogContent className="max-w-md">
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

        <div className="space-y-5">
          {/* Preview */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}20`, color }}
            >
              <PreviewIcon className="h-5 w-5" />
            </span>
            <span className="font-medium text-sm text-muted-foreground">
              {name || "Nome da disciplina"}
            </span>
          </div>

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
            <Label>Ícone</Label>
            <div className="grid grid-cols-5 gap-2">
              {DISCIPLINE_ICONS.map((entry) => {
                const EntryIcon = entry.icon;
                const isSelected = icon === entry.name;
                return (
                  <button
                    key={entry.name}
                    type="button"
                    title={entry.label}
                    onClick={() => setIcon(entry.name)}
                    className="relative flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors hover:bg-accent"
                    style={
                      isSelected
                        ? { borderColor: color, backgroundColor: `${color}15` }
                        : {}
                    }
                  >
                    <EntryIcon
                      className="h-5 w-5"
                      style={isSelected ? { color } : {}}
                    />
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">
                      {entry.label}
                    </span>
                    {isSelected && (
                      <span
                        className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full"
                        style={{ backgroundColor: color }}
                      >
                        <Check className="h-2.5 w-2.5 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
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
