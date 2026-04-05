import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  CalendarDays,
  MapPin,
  Link2,
  LayoutGrid,
  List,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatScheduleSummary } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_CONFIG, ACTIVITY_PIPELINE_CONFIG } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActivityFilters } from "./use-activity-filters";

// ---- Enrollment helpers ----

function getEnrollmentStatus(a: any) {
  const deadlinePassed =
    a.enrollmentDeadline && new Date(a.enrollmentDeadline) < new Date();
  const count = a.enrollmentCount || 0;
  const isFull = a.maxCapacity && count >= a.maxCapacity;
  const almostFull = a.maxCapacity && count >= a.maxCapacity * 0.8 && !isFull;

  if (deadlinePassed)
    return { key: "closed" as const, label: "Cerrada", variant: "outline" as const };
  if (isFull)
    return { key: "full" as const, label: "Completa", variant: "destructive" as const };
  if (almostFull)
    return { key: "open" as const, label: "Últimas plazas", variant: "warning" as const };
  return { key: "open" as const, label: "Abierta", variant: "default" as const };
}

function CopyLinkButton({
  activityId,
  className = "top-3",
}: {
  activityId: string;
  className?: string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        navigator.clipboard.writeText(
          `${window.location.origin}/inscribirse/${activityId}`,
        );
        toast.success("Enlace público copiado");
      }}
      className={`absolute right-3 ${className} h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted z-10`}
      title="Copiar enlace público"
    >
      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

// ---- Course Card (grid mode) ----

function CourseCard({ activity: a }: { activity: any }) {
  const status = getEnrollmentStatus(a);
  const count = a.enrollmentCount || 0;

  return (
    <div className="relative group">
      <Link to={`/actividades/curso/${a.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardContent className="pt-5 pb-4 space-y-2 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-snug">
                {a.title}
              </h3>
              <div className="flex gap-1.5 shrink-0">
                {(a.status === "DRAFT" || a.status === "IN_REVIEW") && (
                  <Badge variant="outline" className="text-xs">Borrador</Badge>
                )}
                <Badge variant={status.variant} className="text-xs whitespace-nowrap">
                  {status.label}
                </Badge>
              </div>
            </div>

            {a.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{a.description}</p>
            )}

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

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {a.location && <span>{a.location}</span>}
              {a.enrollmentPrice > 0 && (
                <span className="font-semibold text-foreground">{a.enrollmentPrice.toFixed(2)} €</span>
              )}
            </div>

            {a.maxCapacity && (
              <div className="flex items-center gap-2 mt-auto pt-2">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      count >= a.maxCapacity ? "bg-red-500" : count >= a.maxCapacity * 0.8 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${Math.min((count / a.maxCapacity) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">{count}/{a.maxCapacity}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
      <CopyLinkButton activityId={a.id} />
    </div>
  );
}

// ---- Enrollment status filter options ----

const ENROLLMENT_FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abierta" },
  { value: "full", label: "Completa" },
  { value: "closed", label: "Cerrada" },
] as const;

// ---- Table row for generic activities ----

const TYPE_DOT: Record<string, string> = {
  TASK: "bg-blue-500",
  MEETING: "bg-amber-500",
  EVENT: "bg-purple-500",
  OTHER: "bg-gray-400",
};

function ActivityTable({ activities }: { activities: any[] }) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<"title" | "startDate" | "type" | "status">("startDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    return [...activities].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = (a.title || "").localeCompare(b.title || "");
      else if (sortField === "startDate") cmp = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      else if (sortField === "type") cmp = (a.type || "").localeCompare(b.type || "");
      else if (sortField === "status") cmp = (a.status || "").localeCompare(b.status || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [activities, sortField, sortDir]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortHeader({ field, children }: { field: typeof sortField; children: React.ReactNode }) {
    return (
      <th
        className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-foreground" : "text-muted-foreground/40"}`} />
        </span>
      </th>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <SortHeader field="title">Nombre</SortHeader>
            <SortHeader field="type">Tipo</SortHeader>
            <SortHeader field="startDate">Fecha</SortHeader>
            <SortHeader field="status">Estado</SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((a: any) => {
            const link = a.enrollmentEnabled
              ? `/actividades/curso/${a.id}`
              : `/actividades/${a.id}`;
            const statusCfg = ACTIVITY_PIPELINE_CONFIG[a.status];
            const dotColor = TYPE_DOT[a.type] || TYPE_DOT.OTHER;

            return (
              <tr
                key={a.id}
                className="hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => navigate(link)}
              >
                <td className="px-4 py-3">
                  <span className="text-sm font-medium">{a.title}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    {ACTIVITY_TYPE_LABELS[a.type] || a.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-muted-foreground">
                    {a.startDate ? formatDate(a.startDate) : "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {statusCfg && (
                    <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                      {statusCfg.label}
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Main ListView ----

export function ListView({
  activities,
  filters,
  isLoading,
}: {
  activities: any[];
  filters: ActivityFilters;
  isLoading: boolean;
}) {
  const [courseViewMode, setCourseViewMode] = useState<"grid" | "list">("grid");
  const isCourseMode = filters.enrollmentEnabled;

  // Client-side enrollment status filter
  const filtered = useMemo(() => {
    if (!isCourseMode || !filters.enrollmentStatus) return activities;
    return activities.filter((a: any) => {
      const status = getEnrollmentStatus(a);
      return status.key === filters.enrollmentStatus;
    });
  }, [activities, isCourseMode, filters.enrollmentStatus]);

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isCourseMode ? "No hay cursos creados" : "No hay actividades registradas."}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Course mode: grid/list with enrollment controls
  if (isCourseMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            {ENROLLMENT_FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() => filters.setEnrollmentStatus(f.value === "all" ? null : f.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  (filters.enrollmentStatus || "all") === f.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <button
              onClick={() => setCourseViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${courseViewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Cuadrícula"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCourseViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${courseViewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No se encontraron cursos con estos filtros</p>
          </div>
        ) : courseViewMode === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((a: any) => (
              <CourseCard key={a.id} activity={a} />
            ))}
          </div>
        ) : (
          <ActivityTable activities={filtered} />
        )}
      </div>
    );
  }

  // Standard: clean table
  return <ActivityTable activities={filtered} />;
}
