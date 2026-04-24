import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastros globais compartilhados entre todos os projetos.
        </p>
      </div>
      <SettingsTabs />
      <div>{children}</div>
    </div>
  );
}
