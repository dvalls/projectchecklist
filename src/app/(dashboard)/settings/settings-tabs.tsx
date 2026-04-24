"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutGrid, Users } from "lucide-react";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/settings/office", label: "Escritório", icon: Building2 },
  { href: "/settings/disciplines", label: "Disciplinas", icon: LayoutGrid },
  { href: "/settings/designers", label: "Projetistas", icon: Users },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b">
      <nav className="-mb-px flex gap-1">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
