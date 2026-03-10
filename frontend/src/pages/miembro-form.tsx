import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useMember, useCreateMember, useUpdateMember } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MiembroFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: member, isLoading: loadingMember } = useMember(id || "");
  const createMember = useCreateMember();
  const updateMember = useUpdateMember(id || "");

  const [loading, setLoading] = useState(false);

  if (isEdit && loadingMember) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cargando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      position: (formData.get("position") as string) || undefined,
      party: (formData.get("party") as string) || undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      bio: (formData.get("bio") as string) || undefined,
      active: true,
    };

    try {
      if (isEdit) {
        await updateMember.mutateAsync(data);
        toast.success("Miembro actualizado correctamente");
      } else {
        await createMember.mutateAsync(data);
        toast.success("Miembro creado correctamente");
      }
      navigate("/miembros");
    } catch {
      toast.error("Error al guardar");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEdit ? "Editar Miembro" : "Nuevo Miembro"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  defaultValue={member?.name}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input
                  id="position"
                  name="position"
                  defaultValue={member?.position || ""}
                  placeholder="Ej: Concejal de Urbanismo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="party">Partido / Grupo</Label>
                <Input
                  id="party"
                  name="party"
                  defaultValue={member?.party || ""}
                  placeholder="Nombre del partido o grupo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={member?.email || ""}
                  placeholder="correo@ejemplo.es"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={member?.phone || ""}
                  placeholder="612 345 678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <Textarea
                id="bio"
                name="bio"
                defaultValue={member?.bio || ""}
                placeholder="Breve descripcion del miembro..."
                rows={4}
              />
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
