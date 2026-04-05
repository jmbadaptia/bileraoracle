import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Plus,
  ChevronDown,
  CalendarDays,
  MapPin,
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
import { cn } from "@/lib/utils";
import { FilterBar } from "./filter-bar";
import { useActivityFilters } from "./use-activity-filters";

// ─── Timeline grouping ──────────────────────────────────────────────

function groupByTimePeriod(activities: any[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const endOfWeek = new Date(today); endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const groups: { label: string; items: any[]; defaultCollapsed: boolean }[] = [
    { label: "Hoy", items: [], defaultCollapsed: false },
    { label: "Esta semana", items: [], defaultCollapsed: false },
    { label: "Este mes", items: [], defaultCollapsed: false },
    { label: "Próximamente", items: [], defaultCollapsed: false },
    { label: "Pasadas", items: [], defaultCollapsed: true },
    { label: "Sin fecha", items: [], defaultCollapsed: true },
  ];

  for (const a of activities) {
    if (!a.startDate) { groups[5].items.push(a); continue; }
    const d = new Date(a.startDate);
    if (d < today) groups[4].items.push(a);
    else if (d < tomorrow) groups[0].items.push(a);
    else if (d <= endOfWeek) groups[1].items.push(a);
    else if (d <= endOfMonth) groups[2].items.push(a);
    else groups[3].items.push(a);
  }

  for (let i = 0; i < 4; i++) groups[i].items.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  groups[4].items.sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return groups.filter(g => g.items.length > 0);
}

// ─── Type color mapping ──────────────────────────────────────────────

const TYPE_STYLE: Record<string, { bg: string; border: string; dateBg: string; dateText: string }> = {
  EVENT:  { bg: "bg-emerald-50",  border: "border-l-emerald-500", dateBg: "bg-emerald-50",  dateText: "text-emerald-700" },
  CURSO:  { bg: "bg-red-50",      border: "border-l-red-400",     dateBg: "bg-red-50",      dateText: "text-red-700" },
  TALLER: { bg: "bg-violet-50",   border: "border-l-violet-500",  dateBg: "bg-violet-50",   dateText: "text-violet-700" },
  OTHER:  { bg: "bg-gray-50",     border: "border-l-gray-400",    dateBg: "bg-gray-50",     dateText: "text-gray-600" },
};

const DEFAULT_STYLE = TYPE_STYLE.OTHER;

// ─── Timeline Item ───────────────────────────────────────────────────

function TimelineItem({ activity: a }: { activity: any }) {
  const link = a.enrollmentEnabled
    ? `/actividades/curso/${a.id}`
    : `/actividades/${a.id}`;

  const date = a.startDate ? new Date(a.startDate) : null;
  const timeStr = date ? date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : null;
  const style = TYPE_STYLE[a.type] || DEFAULT_STYLE;
  const statusCfg = ACTIVITY_PIPELINE_CONFIG[a.status];
  const hasEnrollment = a.enrollmentEnabled && a.maxCapacity;
  const enrollCount = a.enrollmentCount || 0;
  const enrollPct = hasEnrollment ? Math.min((enrollCount / a.maxCapacity) * 100, 100) : 0;

  return (
    <Link to={link} className="block">
      <div className={cn(
        "flex items-stretch rounded-lg border border-l-[3px] overflow-hidden transition-shadow hover:shadow-md bg-background",
        style.border,
      )}>
        {/* Date column */}
        <div className={cn("w-20 shrink-0 flex flex-col items-center justify-center py-3")}>
          {date ? (
            <>
              <p className={cn("text-xs font-semibold uppercase", style.dateText)}>
                {date.toLocaleDateString("es-ES", { weekday: "short" })}
              </p>
              <p className={cn("text-2xl font-bold leading-tight", style.dateText)}>
                {date.getDate()}
              </p>
              <p className={cn("text-[10px] uppercase", style.dateText)}>
                {date.toLocaleDateString("es-ES", { month: "short" })}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 px-4 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate">
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
              {timeStr && <span>{timeStr}h</span>}
              {a.instructor?.name && <span>· {a.instructor.name}</span>}
              {a.location && (
                <span className="flex items-center gap-1">
                  · <MapPin className="h-3 w-3" />{a.location}
                </span>
              )}
            </div>
          </div>

          {/* Enrollment ratio */}
          {hasEnrollment && (
            <div className="shrink-0 text-right w-16">
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                enrollPct >= 90 ? "text-red-600" : enrollPct >= 70 ? "text-amber-600" : "text-muted-foreground",
              )}>
                {enrollCount}/{a.maxCapacity}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Collapsible Section ─────────────────────────────────────────────

function TimelineSection({ label, count, defaultCollapsed, children }: {
  label: string; count: number; defaultCollapsed: boolean; children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <section>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-3 w-full px-1 mb-3 group"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-primary/60 shrink-0" />
        <h2 className="text-sm font-semibold">{label}</h2>
        <Badge variant="secondary" className="text-[11px] px-1.5">{count}</Badge>
        <div className="flex-1 h-px bg-border" />
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground transition-transform",
          collapsed && "-rotate-90",
        )} />
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {children}
        </div>
      )}
    </section>
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
            <TimelineSection
              key={group.label}
              label={group.label}
              count={group.items.length}
              defaultCollapsed={group.defaultCollapsed}
            >
              {group.items.map((a: any) => (
                <TimelineItem key={a.id} activity={a} />
              ))}
            </TimelineSection>
          ))}
        </div>
      )}
    </div>
  );
}
