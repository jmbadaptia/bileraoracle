import { useState } from "react";
import { Link } from "react-router";
import { Plus, UserX, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useUsers, useDeleteUser, useResendInvite } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const { data, isLoading } = useUsers();
  const deleteUser = useDeleteUser();
  const resendInvite = useResendInvite();
  const [deactivateUser, setDeactivateUser] = useState<any>(null);

  const users = data?.members || data?.users || data || [];

  function handleDeactivate() {
    if (!deactivateUser) return;
    deleteUser.mutate(deactivateUser.id, {
      onSuccess: () => {
        toast.success(`${deactivateUser.name} ha sido desactivado`);
        setDeactivateUser(null);
      },
      onError: (err: any) => {
        toast.error(err?.message || "Error al desactivar");
        setDeactivateUser(null);
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
          <p className="text-muted-foreground">Gestión de usuarios y perfiles del equipo</p>
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-md border">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Equipo</h1>
          <p className="text-muted-foreground">
            Gestión de usuarios y perfiles del equipo
          </p>
        </div>
        <Link to="/admin/usuarios/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Usuario
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(users) ? users : []).map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.role === "ADMIN" ? "default" : "secondary"
                        }
                      >
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.active ? "outline" : "destructive"}
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Link to={`/admin/usuarios/${user.id}/editar`}>
                        <Button variant="ghost" size="sm">
                          Editar
                        </Button>
                      </Link>
                      {!user.active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={resendInvite.isPending}
                          onClick={() =>
                            resendInvite.mutate(user.id, {
                              onSuccess: () => toast.success(`Invitación reenviada a ${user.name}`),
                              onError: (err: any) => toast.error(err?.message || "Error al reenviar"),
                            })
                          }
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Reenviar
                        </Button>
                      )}
                      {user.active && user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deleteUser.isPending}
                          onClick={() => setDeactivateUser(user)}
                        >
                          <UserX className="mr-1 h-3 w-3" />
                          Desactivar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-4">
            {(Array.isArray(users) ? users : []).map((user: any) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-md border"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.phone && (
                    <p className="text-xs text-muted-foreground">{user.phone}</p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <Badge
                      variant={
                        user.role === "ADMIN" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    {!user.active && (
                      <Badge variant="destructive" className="text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0 ml-2">
                  <Link to={`/admin/usuarios/${user.id}/editar`}>
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </Link>
                  {!user.active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={resendInvite.isPending}
                      onClick={() =>
                        resendInvite.mutate(user.id, {
                          onSuccess: () => toast.success(`Invitación reenviada a ${user.name}`),
                          onError: (err: any) => toast.error(err?.message || "Error al reenviar"),
                        })
                      }
                    >
                      <Send className="h-3 w-3" />
                    </Button>
                  )}
                  {user.active && user.id !== currentUser?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteUser.isPending}
                      onClick={() => setDeactivateUser(user)}
                    >
                      <UserX className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deactivateUser} onOpenChange={(open) => !open && setDeactivateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateUser?.name} no podrá iniciar sesión. Podrás reactivar su cuenta más adelante.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDeactivate}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
