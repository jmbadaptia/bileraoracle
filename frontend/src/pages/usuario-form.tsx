import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useUser, useCreateUser, useUpdateUser } from "@/api/hooks";
import { ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function UsuarioFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: user, isLoading: loadingUser } = useUser(id || "");
  const createUser = useCreateUser();
  const updateUser = useUpdateUser(id || "");

  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(user?.role || "MEMBER");

  // Sync role when user loads (edit mode)
  if (isEdit && user && role === "MEMBER" && user.role !== "MEMBER") {
    setRole(user.role);
  }

  if (isEdit && loadingUser) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              Editar Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role,
      phone: (formData.get("phone") as string) || undefined,
      bio: (formData.get("bio") as string) || undefined,
    };

    const password = formData.get("password") as string;
    if (password) {
      data.password = password;
    }

    try {
      if (isEdit) {
        await updateUser.mutateAsync(data);
        toast.success("Usuario actualizado correctamente");
      } else {
        await createUser.mutateAsync(data);
        toast.success("Usuario creado correctamente.");
      }
      navigate("/admin/usuarios");
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-muted-foreground" />
            {isEdit ? "Editar Usuario" : "Nuevo Usuario"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos de acceso */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Datos de acceso
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={user?.name}
                    placeholder="Nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    defaultValue={user?.email}
                    placeholder="correo@ejemplo.es"
                  />
                </div>
                {isEdit && (
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Nueva contraseña (dejar vacío para no cambiar)
                    </Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      minLength={6}
                      placeholder="------"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Rol *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Perfil */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Perfil
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    defaultValue={user?.phone || ""}
                    placeholder="Ej: 948 123 456"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    defaultValue={user?.bio || ""}
                    placeholder="Breve descripción del miembro..."
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
