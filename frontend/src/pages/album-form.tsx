import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useAlbum, useCreateAlbum, useUpdateAlbum } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [isPublic, setIsPublic] = useState(true);

  if (isEdit && album && !synced) {
    setTitle(album.title);
    setDescription(album.description || "");
    setIsPublic((album.visibility || "GENERAL") === "GENERAL");
    setSynced(true);
  }

  if (isEdit && isLoading) {
    return (
      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
              Editar álbum
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const visibility = isPublic ? "GENERAL" : "PRIVATE";

    setLoading(true);
    try {
      if (isEdit) {
        await updateAlbum.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          visibility,
        });
        toast.success("Álbum actualizado");
        navigate(`/galeria/${id}`);
      } else {
        const newAlbum: any = await createAlbum.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
          visibility,
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
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            {isEdit ? "Editar álbum" : "Nuevo álbum"}
          </CardTitle>
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
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/30 transition-colors">
              <Checkbox
                checked={isPublic}
                onCheckedChange={(v) => setIsPublic(!!v)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <div className="font-medium text-sm">Visible en el mini-site público</div>
                <p className="text-xs text-muted-foreground">
                  Si está marcado, las fotos de este álbum aparecen en la galería pública de tu mini-site. Desmárcalo para mantenerlo privado.
                </p>
              </div>
            </label>
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
