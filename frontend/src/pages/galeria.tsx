import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus, ImageIcon, Camera, CheckCircle2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useAlbums, useDeleteAlbums } from "@/api/hooks";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function GaleriaPage() {
  const [search, setSearch] = useState("");
  const params: Record<string, string> = { limit: "50" };
  if (search) params.search = search;

  const { data, isLoading } = useAlbums(params);
  const deleteAlbums = useDeleteAlbums();
  const albums = data?.albums || [];
  const token = api.getToken();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function toggleSelect(albumId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(albumId)) next.delete(albumId);
      else next.add(albumId);
      return next;
    });
  }

  function handleDeleteSelected() {
    deleteAlbums.mutate([...selected], {
      onSuccess: (result: any) => {
        toast.success(`${result.deleted} álbum(es) eliminado(s)`);
        setSelected(new Set());
        setShowDeleteConfirm(false);
      },
      onError: () => toast.error("Error al eliminar álbumes"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Galería</h1>
          <p className="text-muted-foreground">Álbumes de fotos del equipo</p>
        </div>
        <Link to="/galeria/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Álbum
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Buscar álbumes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} álbum{selected.size > 1 ? "es" : ""} seleccionado{selected.size > 1 ? "s" : ""}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Eliminar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            <X className="mr-1.5 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : albums.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron álbumes" : "No hay álbumes todavía"}
            </p>
            {!search && (
              <Link to="/galeria/nuevo" className="mt-4">
                <Button variant="outline">Crear primer álbum</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {albums.map((album: any) => {
            const isSelected = selected.has(album.id);
            return (
              <div key={album.id} className="relative group">
                <Link to={`/galeria/${album.id}`}>
                  <Card className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isSelected ? "ring-2 ring-blue-500" : ""}`}>
                    <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                      {album.coverPhoto?.id ? (
                        <img
                          src={`${API_BASE}/photos/${album.coverPhoto.id}/thumbnail?token=${token}`}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20 pointer-events-none" />
                      )}
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-semibold text-sm truncate">{album.title}</h3>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{album._count?.photos || 0} fotos</span>
                        <span>{formatDate(album.createdAt)}</span>
                      </div>
                      {album.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {album.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
                <button
                  onClick={(e) => toggleSelect(album.id, e)}
                  className={`absolute top-2 left-2 z-10 rounded-full transition-all duration-200 ${
                    isSelected
                      ? "opacity-100 text-blue-500 scale-110"
                      : "opacity-0 group-hover:opacity-100 text-white drop-shadow-lg"
                  }`}
                >
                  <CheckCircle2
                    className="h-7 w-7"
                    fill={isSelected ? "currentColor" : "rgba(0,0,0,0.4)"}
                    stroke="white"
                    strokeWidth={1.5}
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar álbumes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Eliminar {selected.size} álbum{selected.size > 1 ? "es" : ""} y todas sus fotos?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelected}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
