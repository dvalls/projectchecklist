"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, LayoutGrid, UserCog, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/office", label: "Escritório", icon: Building2 },
  { href: "/settings/forms", label: "Formulários", icon: FileText },
  { href: "/settings/disciplines", label: "Disciplinas", icon: LayoutGrid },
  { href: "/settings/designers", label: "Projetistas", icon: Users },
  { href: "/settings/users", label: "Usuários", icon: UserCog },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="-mb-px flex">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 border-b-2 px-2 py-2 text-sm font-medium transition-colors sm:flex-none sm:flex-row sm:justify-start sm:gap-2 sm:px-4 sm:py-2.5",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-xs sm:text-sm">{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
