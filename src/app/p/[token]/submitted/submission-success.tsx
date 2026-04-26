"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { readIdentity } from "../identity-storage";
import { PublicFooter, type PublicOfficeSettings } from "../public-footer";

interface Props {
  token: string;
  projectName: string;
  officeSettings: PublicOfficeSettings | null;
}

export function SubmissionSuccess({ token, projectName, officeSettings }: Props) {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const identity = readIdentity(token);
    if (identity?.client_name) {
      const first = identity.client_name.trim().split(/\s+/)[0] ?? null;
      setFirstName(first);
    }
  }, [token]);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="mx-auto flex w-full max-w-3xl flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-success-foreground" />
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">
                {firstName ? `Obrigado, ${firstName}!` : "Formulários enviados!"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Suas respostas para <strong>{projectName}</strong> foram registradas com
                sucesso.
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link href={`/p/${token}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar à capa
                </Link>
              </Button>
              <Button asChild>
                <Link href={`/p/${token}/forms`}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  Ver formulários
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <PublicFooter officeSettings={officeSettings} />
    </div>
  );
}
