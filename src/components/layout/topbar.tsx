import Link from "next/link";
import { ClipboardCheck, LogOut, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { getInitialsFromEmail } from "@/lib/format";

import { signOut } from "@/app/(auth)/login/actions";

export function Topbar({
  userEmail,
  officeName,
}: {
  userEmail: string;
  officeName: string | null;
}) {
  const initials = getInitialsFromEmail(userEmail);

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background px-3 sm:h-16 sm:px-6">
      <Button asChild variant="ghost" className="-ml-2 h-10 px-2">
        <Link href="/" className="flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-primary" />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight">ProjectChecklist</span>
            {officeName && (
              <span className="text-xs text-muted-foreground">{officeName}</span>
            )}
          </div>
        </Link>
      </Button>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <Button asChild variant="ghost" size="icon">
          <Link href="/settings" aria-label="Configurações" title="Configurações">
            <Settings className="h-5 w-5" />
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex h-10 min-w-0 items-center gap-2 px-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {initials}
              </div>
              <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground md:inline">
                {userEmail}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">Logado como</span>
                <span className="truncate text-sm font-medium">{userEmail}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
