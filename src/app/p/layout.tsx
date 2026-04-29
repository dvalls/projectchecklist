import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = { title: "Checklist público" };

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}
