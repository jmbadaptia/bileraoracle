import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAlbum, useCreateAlbum, useUpdateAlbum } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AlbumFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: album, isLoading } = useAlbum(id || "");
  const createAlbum = useCreateAlbum();
  const updateAlbum = useUpdateAlbum(id || "");

  const [loading, setLoading] = useState(false);
  const [synced, setSynced] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  if (isEdit && album && !synced) {
    setTitle(album.title);
    setDescription(album.description || "");
    setSynced(true);
  }

  if (isEdit && isLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cargando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      if (isEdit) {
        await updateAlbum.mutateAsync({ title: title.trim(), description: description.trim() || undefined });
        toast.success("Álbum actualizado");
        navigate(`/galeria/${id}`);
      } else {
        const newAlbum: any = await createAlbum.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
        });
        toast.success("Álbum creado");
        navigate(`/galeria/${newAlbum.id}`);
      }
    } catch {
      toast.error("Error al guardar el álbum");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Editar álbum" : "Nuevo álbum"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre del álbum"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción opcional"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
