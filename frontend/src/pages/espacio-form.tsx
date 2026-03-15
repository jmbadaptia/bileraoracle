import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { Building2, X } from "lucide-react";
import { useSpace, useCreateSpace, useUpdateSpace } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#f97316", "#14b8a6", "#6366f1",
];

export function EspacioFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: space, isLoading } = useSpace(id || "");
  const createSpace = useCreateSpace();
  const updateSpace = useUpdateSpace(id || "");

  const [color, setColor] = useState(space?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [synced, setSynced] = useState(false);

  if (isEdit && space && !synced) {
    setColor(space.color || COLORS[0]);
    setSynced(true);
  }

  if (isEdit && isLoading) {
    return <div className="max-w-2xl mx-auto py-8"><p className="text-muted-foreground">Cargando...</p></div>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || undefined,
      capacity: fd.get("capacity") ? parseInt(fd.get("capacity") as string) : undefined,
      location: (fd.get("location") as string) || undefined,
      color,
    };

    try {
      if (isEdit) {
        await updateSpace.mutateAsync(data);
        toast.success("Espacio actualizado");
      } else {
        await createSpace.mutateAsync(data);
        toast.success("Espacio creado");
      }
      navigate("/espacios");
    } catch {
      toast.error("Error al guardar");
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar espacio" : "Nuevo espacio"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <Label>Nombre *</Label>
          <Input name="name" required defaultValue={space?.name} placeholder="Ej: Sala de juntas" />
        </div>

        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input name="description" defaultValue={space?.description} placeholder="Descripción del espacio" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Capacidad</Label>
            <Input name="capacity" type="number" min="1" defaultValue={space?.capacity} placeholder="Número de personas" />
          </div>
          <div className="space-y-1.5">
            <Label>Ubicación</Label>
            <Input name="location" defaultValue={space?.location} placeholder="Ej: Planta 2, Edificio A" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Color</Label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full transition-all ${
                  color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear espacio"}
          </Button>
        </div>
      </form>
    </div>
  );
}
