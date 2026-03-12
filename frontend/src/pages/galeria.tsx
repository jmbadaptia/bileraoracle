import { useState } from "react";
import { Link } from "react-router";
import { Plus, ImageIcon, Camera } from "lucide-react";
import { useAlbums } from "@/api/hooks";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function GaleriaPage() {
  const [search, setSearch] = useState("");
  const params: Record<string, string> = { limit: "50" };
  if (search) params.search = search;

  const { data, isLoading } = useAlbums(params);
  const albums = data?.albums || [];
  const token = api.getToken();

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
          {albums.map((album: any) => (
              <Link key={album.id} to={`/galeria/${album.id}`} className="group">
                <Card className="overflow-hidden hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer">
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
          ))}
        </div>
      )}

    </div>
  );
}
