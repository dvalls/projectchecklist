"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardCheck,
  FileText,
  FolderKanban,
  LayoutGrid,
  ListChecks,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/projects", label: "Projetos", icon: FolderKanban },
  { href: "/disciplines", label: "Disciplinas", icon: LayoutGrid },
  { href: "/templates", label: "Formulários", icon: FileText },
  { href: "/checklists", label: "Checklists", icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <ClipboardCheck className="h-6 w-6 text-primary" />
        <span className="font-semibold tracking-tight">ProjectChecklist</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
