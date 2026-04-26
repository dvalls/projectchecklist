import { PageHeader } from "@/components/layout/page-header";

import { SettingsTabs } from "./settings-tabs";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Cadastros globais compartilhados entre todos os projetos."
      />
      <SettingsTabs />
      <div>{children}</div>
    </div>
  );
}
