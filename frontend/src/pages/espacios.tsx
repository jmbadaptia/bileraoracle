import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Building2, MapPin, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSpaces, useDeleteSpace } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function EspaciosPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteSpace = useDeleteSpace();

  const params: Record<string, string> = { active: "1" };
  if (search) params.search = search;

  const { data, isLoading } = useSpaces(params);
  const spaces = data?.spaces || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Espacios</h1>
          <p className="text-sm text-muted-foreground">
            Salas y espacios disponibles para reservar
          </p>
        </div>
        {isAdmin && (
          <Link to="/espacios/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar espacio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-3 w-3 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No se encontraron espacios" : "No hay espacios registrados"}
          </p>
          {!search && isAdmin && (
            <Link to="/espacios/nuevo" className="mt-3">
              <Button variant="outline" size="sm">Crear primer espacio</Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {spaces.length} espacio{spaces.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-lg border divide-y">
            {spaces.map((space: any) => (
              <Link
                key={space.id}
                to={`/espacios/${space.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: space.color }}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {space.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {space.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {space.location}
                      </span>
                    )}
                    {space.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {space.capacity} personas
                      </span>
                    )}
                    {space.upcomingCount > 0 && (
                      <span>{space.upcomingCount} reserva{space.upcomingCount !== 1 ? "s" : ""} próxima{space.upcomingCount !== 1 ? "s" : ""}</span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-destructive transition-opacity shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteId(space.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar espacio</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro? Se eliminarán todas las reservas asociadas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteSpace.isPending}
              onClick={() => {
                if (!deleteId) return;
                deleteSpace.mutate(deleteId, {
                  onSuccess: () => {
                    toast.success("Espacio eliminado");
                    setDeleteId(null);
                  },
                  onError: () => toast.error("Error al eliminar"),
                });
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
