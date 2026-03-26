import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Plus, Search, UserCheck, Mail, Phone, Trash2, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useSocios, useDeleteSocio } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type StatusFilter = "all" | "ACTIVO" | "BAJA";
type ViewMode = "grid" | "list";

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "ACTIVO", label: "Activos" },
  { value: "BAJA", label: "Baja" },
];

export function SociosPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVO");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteSocio = useDeleteSocio();

  const params: Record<string, string> = {};
  if (search) params.q = search;
  if (statusFilter !== "all") params.estado = statusFilter;

  const { data, isLoading } = useSocios(params);
  const socios = data?.socios || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Socios</h1>
          <p className="text-muted-foreground">Registro de personas asociadas a tu comunidad</p>
        </div>
        {isAdmin && (
          <Link to="/socios/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
          </Link>
        )}
      </div>

      {/* Search + Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar socios..."
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
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Count */}
      {!isLoading && socios.length > 0 && (
        <p className="text-xs text-muted-foreground">{total} socio{total !== 1 ? "s" : ""}</p>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6 space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card>
          ))}
        </div>
      ) : socios.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search ? "No se encontraron socios" : "No hay socios registrados"}
          </p>
          {!search && isAdmin && (
            <Link to="/socios/nuevo" className="mt-3">
              <Button variant="outline" size="sm">Registrar primer socio</Button>
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {socios.map((s: any) => (
            <SocioCard key={s.id} socio={s} isAdmin={isAdmin} onDelete={setDeleteId} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {socios.map((s: any) => (
            <SocioListItem key={s.id} socio={s} isAdmin={isAdmin} onDelete={setDeleteId} />
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar socio</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">¿Estás seguro? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteSocio.isPending}
              onClick={() => {
                if (!deleteId) return;
                deleteSocio.mutate(deleteId, {
                  onSuccess: () => { toast.success("Socio eliminado"); setDeleteId(null); },
                  onError: () => toast.error("Error al eliminar"),
                });
              }}
            >Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SocioCard({ socio: s, isAdmin, onDelete }: { socio: any; isAdmin: boolean; onDelete: (id: string) => void }) {
  const fullName = [s.nombre, s.apellidos].filter(Boolean).join(" ");

  return (
    <div className="relative group">
      <Link to={`/socios/${s.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
          <CardContent className="pt-5 pb-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base">{fullName}</h3>
                {s.numeroSocio && <p className="text-xs text-muted-foreground">Nº {s.numeroSocio}</p>}
              </div>
              <Badge variant={s.estado === "ACTIVO" ? "default" : "secondary"} className="text-xs shrink-0">
                {s.estado === "ACTIVO" ? "Activo" : "Baja"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {s.email && (
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{s.email}</span>
              )}
              {s.telefono && (
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{s.telefono}</span>
              )}
            </div>
            {s.fechaAlta && (
              <p className="text-xs text-muted-foreground">
                Alta: {new Date(s.fechaAlta).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>
      {isAdmin && (
        <button type="button" onClick={(e) => { e.preventDefault(); onDelete(s.id); }}
          className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-destructive z-10"
        ><Trash2 className="h-3.5 w-3.5" /></button>
      )}
    </div>
  );
}

function SocioListItem({ socio: s, isAdmin, onDelete }: { socio: any; isAdmin: boolean; onDelete: (id: string) => void }) {
  const fullName = [s.nombre, s.apellidos].filter(Boolean).join(" ");

  return (
    <div className="relative group">
      <Link to={`/socios/${s.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{fullName}</h3>
                {s.numeroSocio && <span className="text-xs text-muted-foreground">Nº {s.numeroSocio}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {s.email && <span>{s.email}</span>}
                {s.telefono && <span>{s.telefono}</span>}
              </div>
            </div>
            <Badge variant={s.estado === "ACTIVO" ? "default" : "secondary"} className="text-xs shrink-0">
              {s.estado === "ACTIVO" ? "Activo" : "Baja"}
            </Badge>
          </CardContent>
        </Card>
      </Link>
      {isAdmin && (
        <button type="button" onClick={(e) => { e.preventDefault(); onDelete(s.id); }}
          className="absolute top-1/2 -translate-y-1/2 right-3 h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-destructive z-10"
        ><Trash2 className="h-3.5 w-3.5" /></button>
      )}
    </div>
  );
}
