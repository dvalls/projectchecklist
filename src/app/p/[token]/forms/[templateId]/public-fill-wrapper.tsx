"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import type {
  ClFormField,
  ClFormSection,
  ClFormTemplate,
} from "@/lib/supabase/types";

import { readIdentity, type PublicIdentity } from "../../identity-storage";
import { PublicFormsFlow } from "../../public-forms-flow";

interface Props {
  token: string;
  template: ClFormTemplate;
  sections: ClFormSection[];
  fields: ClFormField[];
}

export function PublicFillWrapper({
  token,
  template,
  sections,
  fields,
}: Props) {
  const router = useRouter();
  const [identity, setIdentity] = useState<PublicIdentity | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = readIdentity(token);
    setHydrated(true);
    if (!saved) {
      router.replace(`/p/${token}`);
      return;
    }
    setIdentity(saved);
  }, [token, router]);

  if (!hydrated || !identity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const backHref = `/p/${token}/forms`;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à lista
          </Link>
          <div className="text-right text-xs text-muted-foreground">
            <div className="font-medium text-foreground">
              {identity.client_name}
            </div>
            <div>{identity.client_email}</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <PublicFormsFlow
          token={token}
          template={template}
          sections={sections}
          fields={fields}
          identity={identity}
          backHref={backHref}
        />
      </div>
    </div>
  );
}
