import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Plus, CalendarDays, MapPin, Clock, Link2, Search, LayoutGrid, List } from "lucide-react";
import { toast } from "sonner";
import { useActivities } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { formatScheduleSummary } from "@/lib/utils";

type StatusFilter = "all" | "open" | "full" | "closed";
type ViewMode = "grid" | "list";

function getEnrollmentStatus(a: any) {
  const deadlinePassed = a.enrollmentDeadline && new Date(a.enrollmentDeadline) < new Date();
  const count = a.enrollmentCount || 0;
  const isFull = a.maxCapacity && count >= a.maxCapacity;
  const almostFull = a.maxCapacity && count >= a.maxCapacity * 0.8 && !isFull;

  if (deadlinePassed) return { key: "closed" as const, label: "Cerrada", variant: "outline" as const };
  if (isFull) return { key: "full" as const, label: "Completa", variant: "destructive" as const };
  if (almostFull) return { key: "open" as const, label: "Últimas plazas", variant: "warning" as const };
  return { key: "open" as const, label: "Abierta", variant: "default" as const };
}

function CapacityBar({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);
  const color = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="flex items-center gap-2 mt-auto pt-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{count}/{max}</span>
    </div>
  );
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abierta" },
  { value: "full", label: "Completa" },
  { value: "closed", label: "Cerrada" },
];

export function InscripcionesPage() {
  const { data, isLoading } = useActivities({ enrollmentEnabled: "1", limit: "50" });
  const activities = data?.activities || [];

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const filtered = useMemo(() => {
    return activities.filter((a: any) => {
      const status = getEnrollmentStatus(a);
      if (statusFilter !== "all" && status.key !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchTitle = a.title?.toLowerCase().includes(q);
        const matchLocation = a.location?.toLowerCase().includes(q);
        const matchDesc = a.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchLocation && !matchDesc) return false;
      }
      return true;
    });
  }, [activities, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos y Talleres</h1>
          <p className="text-muted-foreground">Planifica actividades y gestiona las inscripciones de los participantes</p>
        </div>
        <Link to="/inscripciones/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Search + Filters + View Toggle */}
      {activities.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cursos y talleres..."
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
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-1.5 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay cursos creados</p>
              <p className="text-sm mt-1">Crea un curso o taller para que la gente pueda inscribirse</p>
              <Link to="/inscripciones/nueva">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer curso
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No se encontraron cursos con estos filtros</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((a: any) => (
            <CourseCard key={a.id} activity={a} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any) => (
            <CourseListItem key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ activity: a }: { activity: any }) {
  const status = getEnrollmentStatus(a);
  const count = a.enrollmentCount || 0;

  return (
    <div className="relative group">
      <Link to={`/inscripciones/${a.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
          <CardContent className="pt-5 pb-4 space-y-2 flex flex-col h-full">
            {/* Title + Badge */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-snug">{a.title}</h3>
              <div className="flex gap-1.5 shrink-0">
                {a.publishStatus === "DRAFT" && (
                  <Badge variant="outline" className="text-xs">Borrador</Badge>
                )}
                <Badge variant={status.variant} className="text-xs whitespace-nowrap">
                  {status.label}
                </Badge>
              </div>
            </div>

            {/* Description */}
            {a.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
            )}

            {/* Schedule summary */}
            {(() => {
              const summary = formatScheduleSummary(a.sessions || []);
              if (summary) return (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  {summary}
                </p>
              );
              if (a.startDate) return (
                <p className="text-sm text-muted-foreground">
                  {new Date(a.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              );
              return null;
            })()}

            {/* Location + price */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {a.location && <span>{a.location}</span>}
              {a.enrollmentPrice > 0 && (
                <span className="font-semibold text-foreground">{a.enrollmentPrice.toFixed(2)} €</span>
              )}
            </div>

            {/* Capacity bar */}
            {a.maxCapacity && <CapacityBar count={count} max={a.maxCapacity} />}
          </CardContent>
        </Card>
      </Link>
      <CopyLinkButton activityId={a.id} />
    </div>
  );
}

function CourseListItem({ activity: a }: { activity: any }) {
  const status = getEnrollmentStatus(a);
  const count = a.enrollmentCount || 0;

  return (
    <div className="relative group">
      <Link to={`/inscripciones/${a.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="py-3 flex items-center gap-4">
            {/* Title + description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                {a.publishStatus === "DRAFT" && (
                  <Badge variant="outline" className="text-xs shrink-0">Borrador</Badge>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{a.description}</p>
              )}
            </div>

            {/* Meta */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground shrink-0">
              {(() => {
                const summary = formatScheduleSummary(a.sessions || []);
                if (summary) return (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {summary}
                  </span>
                );
                if (a.startDate) return (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(a.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                );
                return null;
              })()}
              {a.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {a.location}
                </span>
              )}
              {a.enrollmentPrice > 0 && (
                <span className="font-semibold text-foreground">{a.enrollmentPrice.toFixed(2)} €</span>
              )}
            </div>

            {/* Capacity mini bar */}
            {a.maxCapacity && (
              <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      count >= a.maxCapacity ? "bg-red-500" : count >= a.maxCapacity * 0.8 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((count / a.maxCapacity) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{count}/{a.maxCapacity}</span>
              </div>
            )}

            {/* Status badge */}
            <Badge variant={status.variant} className="text-xs shrink-0 whitespace-nowrap">
              {status.label}
            </Badge>
          </CardContent>
        </Card>
      </Link>
      <CopyLinkButton activityId={a.id} className="top-1/2 -translate-y-1/2" />
    </div>
  );
}

function CopyLinkButton({ activityId, className = "top-3" }: { activityId: string; className?: string }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(`${window.location.origin}/inscribirse/${activityId}`);
        toast.success("Enlace público copiado");
      }}
      className={`absolute right-3 ${className} h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted z-10`}
      title="Copiar enlace público"
    >
      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
