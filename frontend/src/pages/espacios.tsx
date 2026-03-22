import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Plus, Search, Building2, MapPin, Users, Trash2, LayoutGrid, List, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useSpaces, useDeleteSpace } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type StatusFilter = "all" | "available" | "busy";
type ViewMode = "grid" | "list";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "available", label: "Disponible" },
  { value: "busy", label: "Ocupado" },
];

export function EspaciosPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteSpace = useDeleteSpace();

  const params: Record<string, string> = { active: "1" };
  if (search) params.search = search;

  const { data, isLoading } = useSpaces(params);
  const spaces = data?.spaces || [];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return spaces;
    return spaces.filter((s: any) => {
      const isBusy = s.upcomingCount > 0;
      return statusFilter === "busy" ? isBusy : !isBusy;
    });
  }, [spaces, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Espacios</h1>
          <p className="text-muted-foreground">Salas y espacios disponibles para reservar</p>
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

      {/* Search + Filters + View Toggle */}
      {spaces.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar espacios..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista cuadrícula"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">No hay espacios registrados</p>
          {isAdmin && (
            <Link to="/espacios/nuevo" className="mt-3">
              <Button variant="outline" size="sm">Crear primer espacio</Button>
            </Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No se encontraron espacios con estos filtros</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((space: any) => (
            <SpaceCard key={space.id} space={space} isAdmin={isAdmin} onDelete={setDeleteId} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((space: any) => (
            <SpaceListItem key={space.id} space={space} isAdmin={isAdmin} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {/* Delete dialog */}
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

function SpaceCard({ space, isAdmin, onDelete }: { space: any; isAdmin: boolean; onDelete: (id: string) => void }) {
  const hasBokings = space.upcomingCount > 0;

  return (
    <div className="relative group">
      <Link to={`/espacios/${space.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
          <CardContent className="pt-5 pb-4 space-y-2">
            {/* Color dot + Title + Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: space.color }}
                />
                <h3 className="font-semibold text-base leading-snug truncate">{space.name}</h3>
              </div>
              <Badge
                variant={hasBokings ? "default" : "secondary"}
                className="text-xs shrink-0"
              >
                {hasBokings ? "Ocupado" : "Disponible"}
              </Badge>
            </div>

            {/* Description */}
            {space.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{space.description}</p>
            )}

            {/* Meta: location, capacity, bookings */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {space.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {space.location}
                </span>
              )}
              {space.capacity && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {space.capacity} personas
                </span>
              )}
              {hasBokings && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {space.upcomingCount} reserva{space.upcomingCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
      {isAdmin && (
        <button
          type="button"
          className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-destructive z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(space.id);
          }}
          title="Eliminar espacio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function SpaceListItem({ space, isAdmin, onDelete }: { space: any; isAdmin: boolean; onDelete: (id: string) => void }) {
  const hasBookings = space.upcomingCount > 0;

  return (
    <div className="relative group">
      <Link to={`/espacios/${space.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="py-3 flex items-center gap-4">
            {/* Color dot + Title */}
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: space.color }}
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{space.name}</h3>
              {space.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{space.description}</p>
              )}
            </div>

            {/* Meta */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground shrink-0">
              {space.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {space.location}
                </span>
              )}
              {space.capacity && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {space.capacity}
                </span>
              )}
              {hasBookings && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {space.upcomingCount}
                </span>
              )}
            </div>

            {/* Status badge */}
            <Badge
              variant={hasBookings ? "default" : "secondary"}
              className="text-xs shrink-0"
            >
              {hasBookings ? "Ocupado" : "Disponible"}
            </Badge>
          </CardContent>
        </Card>
      </Link>
      {isAdmin && (
        <button
          type="button"
          className="absolute top-1/2 -translate-y-1/2 right-3 h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-destructive z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(space.id);
          }}
          title="Eliminar espacio"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
