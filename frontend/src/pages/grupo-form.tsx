import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useCreateGroup } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function GrupoFormPage() {
  const navigate = useNavigate();
  const createGroup = useCreateGroup();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    createGroup.mutate(
      { name: name.trim(), description: description.trim() || undefined },
      {
        onSuccess: (data: any) => {
          toast.success("Grupo creado");
          navigate(`/grupos/${data.id}`);
        },
        onError: () => toast.error("Error al crear el grupo"),
      }
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Nuevo grupo</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Comision de fiestas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descripcion</Label>
              <Input
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion opcional del grupo"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/grupos")}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!name.trim() || createGroup.isPending}>
                Crear grupo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
