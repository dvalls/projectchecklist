"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import type { ClDiscipline } from "@/lib/supabase/types";

interface DisciplineFilterProps {
  disciplines: ClDiscipline[];
  activeId: string | null;
}

export function DisciplineFilter({ disciplines, activeId }: DisciplineFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSelect = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("disciplina", id);
      } else {
        params.delete("disciplina");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  if (disciplines.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant={activeId === null ? "default" : "outline"}
        onClick={() => handleSelect(null)}
      >
        Todos
      </Button>
      {disciplines.map((d) => (
        <Button
          key={d.id}
          size="sm"
          variant={activeId === d.id ? "default" : "outline"}
          onClick={() => handleSelect(d.id)}
          style={
            activeId === d.id
              ? undefined
              : { borderColor: `${d.color}66`, color: d.color }
          }
        >
          {d.name}
        </Button>
      ))}
    </div>
  );
}
