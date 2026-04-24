"use client";

import { PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-context";

export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();

  if (!collapsed) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label="Mostrar menu"
      title="Mostrar menu"
      className="h-9 w-9"
    >
      <PanelLeftOpen className="h-4 w-4" />
    </Button>
  );
}
