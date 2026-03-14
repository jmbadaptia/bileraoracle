import { useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft, Upload, Download, Trash2, Pencil, ImageIcon, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { useAlbum, useUploadPhotos, useDeleteAlbum, useDeletePhoto } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: album, isLoading } = useAlbum(id!);
  const uploadPhotos = useUploadPhotos(id!);
  const deleteAlbum = useDeleteAlbum();
  const deletePhoto = useDeletePhoto(id!);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [showDeleteAlbumConfirm, setShowDeleteAlbumConfirm] = useState(false);
  const [showDeletePhotosConfirm, setShowDeletePhotosConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (isLoading || !album) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Álbum no encontrado"}
        </h1>
      </div>
    );
  }

  const photos = album.photos || [];
  const token = api.getToken();

  const masonryPhotos = photos.map((photo: any) => ({
    src: `${API_BASE}/photos/${photo.id}/thumbnail?token=${token}`,
    width: photo.width || 400,
    height: photo.height || 300,
    key: photo.id,
  }));

  const lightboxSlides = photos.map((photo: any) => ({
    src: `${API_BASE}/photos/${photo.id}/file?token=${token}`,
    width: photo.width || 1920,
    height: photo.height || 1080,
  }));

  function toggleSelect(photoId: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const result: any = await uploadPhotos.mutateAsync(formData);
      toast.success(`${result.count} foto(s) subida(s)`);
    } catch {
      toast.error("Error al subir fotos");
    }

    setUploading(false);
    e.target.value = "";
  }

  function handleDeleteAlbum() {
    deleteAlbum.mutate(id!, {
      onSuccess: () => {
        toast.success("Álbum eliminado");
        navigate("/galeria");
      },
      onError: () => toast.error("Error al eliminar"),
    });
  }

  async function handleDeleteSelectedPhotos() {
    const ids = Array.from(selected);
    let deleted = 0;
    for (const photoId of ids) {
      try {
        await deletePhoto.mutateAsync(photoId);
        deleted++;
      } catch {
        // continue
      }
    }
    if (deleted > 0) {
      toast.success(`${deleted} foto${deleted !== 1 ? "s" : ""} eliminada${deleted !== 1 ? "s" : ""}`);
    }
    setSelected(new Set());
    setShowDeletePhotosConfirm(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/galeria"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold">{album.title}</h1>
          </div>
          {album.description && (
            <p className="text-sm text-muted-foreground ml-7">
              {album.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground ml-7 mt-1">
            {photos.length} fotos · Creado por {album.creatorName} · {formatDate(album.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {uploading ? "Subiendo..." : "Subir fotos"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          {photos.length > 0 && (
            <a
              href={`${API_BASE}/albums/${id}/download`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-4 w-4" />
                Descargar
              </Button>
            </a>
          )}
          <Link to={`/galeria/${id}/editar`}>
            <Button variant="outline" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setShowDeleteAlbumConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Selection bar for photos */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {selected.size} foto{selected.size !== 1 ? "s" : ""} seleccionada{selected.size !== 1 ? "s" : ""}
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
            onClick={() => setShowDeletePhotosConfirm(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Eliminar
          </Button>
        </div>
      )}

      {/* Gallery */}
      {photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Este álbum está vacío. Sube las primeras fotos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div>
          <MasonryPhotoAlbum
            photos={masonryPhotos}
            columns={(containerWidth) => {
              if (containerWidth < 400) return 2;
              if (containerWidth < 700) return 3;
              return 4;
            }}
            spacing={8}
            onClick={({ index }) => {
              // Don't open lightbox if we're in selection mode
              if (selected.size > 0) return;
              setLightboxIndex(index);
            }}
            render={{
              photo: ({ onClick }, { photo, index, width, height }) => {
                const photoId = photos[index]?.id;
                const isSelected = selected.has(photoId);
                return (
                  <div
                    className="relative group cursor-pointer overflow-hidden rounded"
                    style={{ width, height }}
                    onClick={(e) => {
                      if (selected.size > 0) {
                        toggleSelect(photoId, e);
                      } else {
                        onClick?.(e);
                      }
                    }}
                  >
                    <img
                      src={photo.src}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Selection overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-blue-500/20" />
                    )}
                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => toggleSelect(photoId, e)}
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
              },
            }}
          />

          <Lightbox
            open={lightboxIndex >= 0}
            close={() => setLightboxIndex(-1)}
            index={lightboxIndex}
            slides={lightboxSlides}
            plugins={[Zoom]}
          />
        </div>
      )}

      {/* Delete album confirmation */}
      <Dialog open={showDeleteAlbumConfirm} onOpenChange={setShowDeleteAlbumConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar álbum</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar el álbum "{album.title}" y todas sus fotos?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAlbumConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAlbum}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete photos confirmation */}
      <Dialog open={showDeletePhotosConfirm} onOpenChange={setShowDeletePhotosConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar fotos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar {selected.size} foto{selected.size !== 1 ? "s" : ""}?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePhotosConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelectedPhotos}
              disabled={deletePhoto.isPending}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
