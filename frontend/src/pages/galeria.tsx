import { useState } from "react";
import { Link } from "react-router";
import { Plus, ImageIcon, Camera, Search, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAlbums, useDeleteAlbum } from "@/api/hooks";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function GaleriaPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteAlbum = useDeleteAlbum();

  const params: Record<string, string> = { limit: "50" };
  if (search) params.search = search;

  const { data, isLoading } = useAlbums(params);
  const albums = data?.albums || [];
  const token = api.getToken();

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

  async function handleDeleteSelected() {
    const ids = Array.from(selected);
    let deleted = 0;
    for (const id of ids) {
      try {
        await deleteAlbum.mutateAsync(id);
        deleted++;
      } catch {
        // continue with remaining
      }
    }
    if (deleted > 0) {
      toast.success(`${deleted} álbum${deleted !== 1 ? "es" : ""} eliminado${deleted !== 1 ? "s" : ""}`);
    }
    setSelected(new Set());
    setShowDeleteConfirm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Galería</h1>
          <p className="text-sm text-muted-foreground">Álbumes de fotos del equipo</p>
        </div>
        <Link to="/galeria/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Álbum
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar álbumes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(new Set())}
            className="text-blue-800 dark:text-blue-200"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full rounded-none" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Camera className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No se encontraron álbumes" : "No hay álbumes todavía"}
          </p>
          {!search && (
            <Link to="/galeria/nuevo" className="mt-3">
              <Button variant="outline" size="sm">Crear primer álbum</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {albums.map((album: any) => {
            const isSelected = selected.has(album.id);
            return (
              <Link key={album.id} to={`/galeria/${album.id}`} className="group">
                <Card className={`overflow-hidden hover:shadow-sm transition-all cursor-pointer ${
                  isSelected ? "ring-2 ring-blue-500" : ""
                }`}>
                  <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                    {album.coverPhotoId ? (
                      <img
                        src={`${API_BASE}/photos/${album.coverPhotoId}/thumbnail?token=${token}`}
                        alt={album.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    {/* Selection overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20" />
                    )}
                    {/* Selection checkbox */}
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
                  <CardContent className="p-3">
                    <h3 className="font-semibold text-sm truncate">{album.title}</h3>
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>{album.photoCount || 0} fotos</span>
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
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar álbumes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar {selected.size} álbum{selected.size !== 1 ? "es" : ""} y todas sus fotos?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleteAlbum.isPending}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
