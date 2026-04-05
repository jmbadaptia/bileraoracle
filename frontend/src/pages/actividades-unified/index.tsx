import { useMemo } from "react";
import { Link } from "react-router";
import {
  Plus,
  ChevronDown,
  CalendarDays,
  MapPin,
  Users,
  Clock,
} from "lucide-react";
import { useActivities } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACTIVITY_TYPE_CONFIG, ACTIVITY_TYPE_LABELS, ACTIVITY_PIPELINE_CONFIG } from "@/lib/constants";
import { FilterBar } from "./filter-bar";
import { useActivityFilters } from "./use-activity-filters";

// ─── Timeline grouping ──────────────────────────────────────────────

function groupByTimePeriod(activities: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const groups: { label: string; items: any[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Esta semana", items: [] },
    { label: "Este mes", items: [] },
    { label: "Próximamente", items: [] },
    { label: "Pasadas", items: [] },
    { label: "Sin fecha", items: [] },
  ];

  for (const a of activities) {
    if (!a.startDate) {
      groups[5].items.push(a);
      continue;
    }
    const d = new Date(a.startDate);
    if (d < today) groups[4].items.push(a);
    else if (d < tomorrow) groups[0].items.push(a);
    else if (d <= endOfWeek) groups[1].items.push(a);
    else if (d <= endOfMonth) groups[2].items.push(a);
    else groups[3].items.push(a);
  }

  // Sort: future groups ASC, past DESC
  for (let i = 0; i < 4; i++) groups[i].items.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  groups[4].items.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return groups.filter(g => g.items.length > 0);
}

// ─── Type dot color (solid, for timeline) ────────────────────────────

const TYPE_DOT: Record<string, string> = {
  EVENT: "bg-emerald-500",
  TALLER: "bg-violet-500",
  TASK: "bg-blue-500",
  MEETING: "bg-sky-500",
  OTHER: "bg-gray-400",
};

// ─── Timeline Item ───────────────────────────────────────────────────

function TimelineItem({ activity: a }: { activity: any }) {
  const link = a.enrollmentEnabled
    ? `/actividades/curso/${a.id}`
    : `/actividades/${a.id}`;

  const date = a.startDate ? new Date(a.startDate) : null;
  const timeStr = date ? date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
  const dateStr = date ? date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) : null;
  const dotColor = TYPE_DOT[a.type] || TYPE_DOT.OTHER;
  const statusCfg = ACTIVITY_PIPELINE_CONFIG[a.status];
  const hasEnrollment = a.enrollmentEnabled && a.maxCapacity;
  const enrollCount = a.enrollmentCount || 0;

  return (
    <Link to={link} className="block">
      <div className="flex items-start gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors group">
        {/* Date column */}
        <div className="w-16 shrink-0 text-center pt-0.5">
          {date ? (
            <>
              <p className="text-xs font-semibold text-muted-foreground uppercase">{date.toLocaleDateString("es-ES", { weekday: "short" })}</p>
              <p className="text-lg font-bold leading-tight">{date.getDate()}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{date.toLocaleDateString("es-ES", { month: "short" })}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        {/* Dot + line */}
        <div className="flex flex-col items-center pt-2 shrink-0">
          <span className={`w-3 h-3 rounded-full ${dotColor}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold group-hover:text-primary transition-colors truncate">
              {a.title}
            </h3>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ACTIVITY_TYPE_CONFIG[a.type]?.color || ""}`}>
              {ACTIVITY_TYPE_LABELS[a.type] || a.type}
            </Badge>
            {statusCfg && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${statusCfg.color}`}>
                {statusCfg.label}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            {timeStr && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />{timeStr}
              </span>
            )}
            {a.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{a.location}
              </span>
            )}
            {hasEnrollment && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />{enrollCount}/{a.maxCapacity}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────

export function ActividadesUnifiedPage() {
  const filters = useActivityFilters();
  const { data, isLoading } = useActivities(filters.apiParams);
  const activities = data?.activities || [];

  const filtered = useMemo(() => {
    let list = activities;
    if (filters.types.size > 1) {
      list = list.filter((a: any) => filters.types.has(a.type));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (a: any) =>
          a.title?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activities, filters.types, filters.search]);

  const timelineGroups = useMemo(() => groupByTimePeriod(filtered), [filtered]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actividades</h1>
          <p className="text-sm text-muted-foreground">Eventos, cursos y talleres</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/actividades/nueva">Nueva actividad</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/actividades/curso/nuevo">Nuevo curso / taller</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} />

      {/* Timeline */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No hay actividades</p>
        </div>
      ) : (
        <div className="space-y-6">
          {timelineGroups.map((group) => (
            <section key={group.label}>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">
                {group.label}
              </h2>
              <div className="rounded-lg border divide-y">
                {group.items.map((a: any) => (
                  <TimelineItem key={a.id} activity={a} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
