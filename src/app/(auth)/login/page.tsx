import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">ProjectChecklist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Checklists orientados por projeto.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
