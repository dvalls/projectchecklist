interface InactiveLinkCardProps {
  description?: string;
}

const DEFAULT_DESCRIPTION =
  "Este link foi desativado pelo responsável. Entre em contato para obter um novo.";

export function InactiveLinkCard({
  description = DEFAULT_DESCRIPTION,
}: InactiveLinkCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="max-w-md space-y-3 rounded-lg border bg-background p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Link indisponível</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
