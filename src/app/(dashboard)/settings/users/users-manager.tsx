"use client";

import { useState, useTransition } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";

import { formatDate } from "@/lib/format";
import { getInitialsFromEmail } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";

import {
  changeUserPassword,
  createUser,
  inviteUser,
  removeUser,
  updateUserRole,
  type UserRole,
} from "./actions";

interface UserRow {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
}

interface Props {
  users: UserRow[];
  currentUserId: string;
}

export function UsersManager({ users, currentUserId }: Props) {
  const [creating, setCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRow | null>(null);
  const [changingPasswordFor, setChangingPasswordFor] = useState<UserRow | null>(null);

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Gerencie quem tem acesso ao sistema."
        actions={
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo usuário
          </Button>
        }
      />

      {users.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<UserCircle2 className="h-6 w-6" />}
          title="Nenhum usuário cadastrado"
          description='Clique em "Novo usuário" para adicionar o primeiro acesso.'
        />
      ) : (
        <div className="mt-4 space-y-2">
          {users.map((u) => (
            <UserRowItem
              key={u.id}
              user={u}
              isSelf={u.id === currentUserId}
              onEditRole={() => setEditingRole(u)}
              onChangePassword={() => setChangingPasswordFor(u)}
            />
          ))}
        </div>
      )}

      {creating ? <NewUserDialog onClose={() => setCreating(false)} /> : null}

      {editingRole ? (
        <EditRoleDialog user={editingRole} onClose={() => setEditingRole(null)} />
      ) : null}

      {changingPasswordFor ? (
        <ChangePasswordDialog
          user={changingPasswordFor}
          isSelf={changingPasswordFor.id === currentUserId}
          onClose={() => setChangingPasswordFor(null)}
        />
      ) : null}
    </>
  );
}

function UserRowItem({
  user,
  isSelf,
  onEditRole,
  onChangePassword,
}: {
  user: UserRow;
  isSelf: boolean;
  onEditRole: () => void;
  onChangePassword: () => void;
}) {
  const isPending = user.lastSignInAt === null;
  const initials = getInitialsFromEmail(user.email);

  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{user.email}</span>
            {isSelf && (
              <Badge variant="outline" className="text-xs">
                Você
              </Badge>
            )}
            <RoleBadge role={user.role} />
            {isPending && (
              <Badge variant="secondary" className="text-xs">
                Convite pendente
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Criado em {formatDate(user.createdAt)}
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onChangePassword}
            title="Alterar senha"
          >
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onEditRole}
            disabled={isSelf}
            title="Editar papel"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <DeleteUserButton user={user} disabled={isSelf} />
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <Badge className="gap-1 text-xs">
        <ShieldCheck className="h-3 w-3" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs">
      Membro
    </Badge>
  );
}

function DeleteUserButton({ user, disabled }: { user: UserRow; disabled: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await removeUser(user.id);
      if (res.error) toast.error(res.error);
      else toast.success("Usuário removido.");
    });
  }

  return (
    <ConfirmDialog
      destructive
      title={`Remover "${user.email}"?`}
      description="O acesso será revogado imediatamente. Esta ação não pode ser desfeita."
      confirmLabel="Remover"
      onConfirm={handleDelete}
      trigger={
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          disabled={disabled || isPending}
          title="Remover usuário"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      }
    />
  );
}

function EditRoleDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [role, setRole] = useState<UserRole>(user.role === "admin" ? "admin" : "member");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updateUserRole(user.id, role);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Papel atualizado.");
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar papel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {user.email}
          </div>
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type NewUserMode = "create" | "invite";

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<NewUserMode>("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>("member");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (mode === "create") {
      if (password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("As senhas não coincidem.");
        return;
      }
    }

    startTransition(async () => {
      const res =
        mode === "create"
          ? await createUser({ email, password, role })
          : await inviteUser({ email, role });

      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        mode === "create" ? "Usuário criado com sucesso." : "Convite enviado.",
      );
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Modo */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "create" ? "default" : "outline"}
              onClick={() => setMode("create")}
            >
              <KeyRound className="mr-2 h-3.5 w-3.5" />
              Criar com senha
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "invite" ? "default" : "outline"}
              onClick={() => setMode("invite")}
            >
              <Mail className="mr-2 h-3.5 w-3.5" />
              Convidar por e-mail
            </Button>
          </div>

          {mode === "invite" && (
            <p className="text-xs text-muted-foreground">
              O Supabase enviará um link de acesso para o e-mail informado.
            </p>
          )}

          {/* E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="nu-email">E-mail</Label>
            <Input
              id="nu-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com"
            />
          </div>

          {/* Senha (apenas no modo criar) */}
          {mode === "create" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="nu-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="nu-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nu-confirm">Confirmar senha</Label>
                <Input
                  id="nu-confirm"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </>
          )}

          {/* Papel */}
          <div className="space-y-1.5">
            <Label>Papel</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isPending || !email.trim()}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "create" ? "Criar usuário" : "Enviar convite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  user,
  isSelf,
  onClose,
}: {
  user: UserRow;
  isSelf: boolean;
  onClose: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      if (isSelf) {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          toast.error(error.message);
          return;
        }
      } else {
        const res = await changeUserPassword(user.id, newPassword);
        if (res.error) {
          toast.error(res.error);
          return;
        }
      }
      toast.success("Senha alterada com sucesso.");
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            {isSelf ? "Alterar minha senha" : "Alterar senha"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isSelf && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {user.email}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="cp-new">Nova senha</Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm">Confirmar nova senha</Label>
            <Input
              id="cp-confirm"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !newPassword || !confirmPassword}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar nova senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
