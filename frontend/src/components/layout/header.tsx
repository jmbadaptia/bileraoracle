import { useState } from "react";
import { LogOut, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./mobile-nav";
import { FulltextSearch } from "@/components/search/fulltext-search";
import { ROLE_LABELS } from "@/lib/constants";

interface HeaderProps {
  userName: string;
  userEmail: string;
  userRole: string;
  pageTitle?: string;
}

export function Header({ userName, userEmail, userRole, pageTitle }: HeaderProps) {
  const { logout } = useAuth();
  const [pwdOpen, setPwdOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const currentPassword = fd.get("currentPassword") as string;
    const newPassword = fd.get("newPassword") as string;
    const confirmPassword = fd.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setSaving(false);
      return;
    }

    try {
      await api.put("/auth/change-password", { currentPassword, newPassword });
      toast.success("Contraseña actualizada correctamente");
      setPwdOpen(false);
    } catch (err: any) {
      setError(err?.message || "Error al cambiar la contraseña");
    }
    setSaving(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <MobileNav userRole={userRole} />
        {pageTitle && (
          <h1 className="text-sm font-semibold truncate">{pageTitle}</h1>
        )}
        <FulltextSearch />
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABELS[userRole] || userRole}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setPwdOpen(true)}
              className="cursor-pointer"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Introduce tu contraseña actual y elige una nueva.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={6}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwdOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
