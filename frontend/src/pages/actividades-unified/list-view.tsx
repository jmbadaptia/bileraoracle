import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  CalendarDays,
  MapPin,
  Link2,
  LayoutGrid,
  List,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatScheduleSummary } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarGroup } from "@/components/ui/avatar-group";
import type { ActivityFilters } from "./use-activity-filters";

// ---- Enrollment helpers ----

function getEnrollmentStatus(a: any) {
  const deadlinePassed =
    a.enrollmentDeadline && new Date(a.enrollmentDeadline) < new Date();
  const count = a.enrollmentCount || 0;
  const isFull = a.maxCapacity && count >= a.maxCapacity;
  const almostFull = a.maxCapacity && count >= a.maxCapacity * 0.8 && !isFull;

  if (deadlinePassed)
    return {
      key: "closed" as const,
      label: "Cerrada",
      variant: "outline" as const,
    };
  if (isFull)
    return {
      key: "full" as const,
      label: "Completa",
      variant: "destructive" as const,
    };
  if (almostFull)
    return {
      key: "open" as const,
      label: "Últimas plazas",
      variant: "warning" as const,
    };
  return { key: "open" as const, label: "Abierta", variant: "default" as const };
}

function CapacityBar({ count, max }: { count: number; max: number }) {
  const pct = Math.min((count / max) * 100, 100);
  const color =
    pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500";

  return (
    <div className="flex items-center gap-2 mt-auto pt-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {count}/{max}
      </span>
    </div>
  );
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

// ---- Course views ----

function CourseCard({ activity: a }: { activity: any }) {
  const status = getEnrollmentStatus(a);
  const count = a.enrollmentCount || 0;

  return (
    <div className="relative group">
      <Link to={`/actividades/curso/${a.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
          <CardContent className="pt-5 pb-4 space-y-2 flex flex-col h-full">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-base leading-snug">
                {a.title}
              </h3>
              <div className="flex gap-1.5 shrink-0">
                {a.publishStatus === "DRAFT" && (
                  <Badge variant="outline" className="text-xs">
                    Borrador
                  </Badge>
                )}
                <Badge variant={status.variant} className="text-xs whitespace-nowrap">
                  {status.label}
                </Badge>
              </div>
            </div>

            {a.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {a.description}
              </p>
            )}

            {(() => {
              const summary = formatScheduleSummary(a.sessions || []);
              if (summary)
                return (
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    {summary}
                  </p>
                );
              if (a.startDate)
                return (
                  <p className="text-sm text-muted-foreground">
                    {new Date(a.startDate).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                );
              return null;
            })()}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {a.location && <span>{a.location}</span>}
              {a.enrollmentPrice > 0 && (
                <span className="font-semibold text-foreground">
                  {a.enrollmentPrice.toFixed(2)} €
                </span>
              )}
            </div>

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
      <Link to={`/actividades/curso/${a.id}`}>
        <Card className="hover:border-primary/30 transition-colors cursor-pointer">
          <CardContent className="py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                {a.publishStatus === "DRAFT" && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    Borrador
                  </Badge>
                )}
              </div>
              {a.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {a.description}
                </p>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground shrink-0">
              {(() => {
                const summary = formatScheduleSummary(a.sessions || []);
                if (summary)
                  return (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {summary}
                    </span>
                  );
                if (a.startDate)
                  return (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(a.startDate).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "short",
                      })}
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
                <span className="font-semibold text-foreground">
                  {a.enrollmentPrice.toFixed(2)} €
                </span>
              )}
            </div>

            {a.maxCapacity && (
              <div className="hidden sm:flex items-center gap-2 w-28 shrink-0">
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      count >= a.maxCapacity
                        ? "bg-red-500"
                        : count >= a.maxCapacity * 0.8
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min((count / a.maxCapacity) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count}/{a.maxCapacity}
                </span>
              </div>
            )}

            <Badge
              variant={status.variant}
              className="text-xs shrink-0 whitespace-nowrap"
            >
              {status.label}
            </Badge>
          </CardContent>
        </Card>
      </Link>
      <CopyLinkButton
        activityId={a.id}
        className="top-1/2 -translate-y-1/2"
      />
    </div>
  );
}

// ---- Generic activity list item ----

function ActivityListItem({ activity }: { activity: any }) {
  const link = activity.enrollmentEnabled
    ? `/actividades/curso/${activity.id}`
    : `/actividades/${activity.id}`;

  return (
    <Link to={link}>
      <Card className="hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{activity.title}</h3>
                <Badge variant="secondary" className="text-xs">
                  {ACTIVITY_TYPE_LABELS[activity.type]}
                </Badge>
                <StatusBadge status={activity.status} className="text-xs" />
                {activity.tags?.map((tag: any) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs"
                    style={
                      tag.color
                        ? { borderColor: tag.color, color: tag.color }
                        : undefined
                    }
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span>{activity.ownerName}</span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(activity.startDate)}
                </span>
                {activity.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {activity.location}
                  </span>
                )}
              </div>
            </div>
            <AvatarGroup people={activity.attendees || []} max={4} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---- Enrollment status filter for course mode ----

const ENROLLMENT_FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "open", label: "Abierta" },
  { value: "full", label: "Completa" },
  { value: "closed", label: "Cerrada" },
] as const;

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

  // Client-side enrollment status filter + multi-type filter + search
  const filtered = useMemo(() => {
    return activities.filter((a: any) => {
      // Multi-type client-side filter (API only supports single type)
      if (filters.types.size > 1 && !filters.types.has(a.type)) return false;

      // Search filter
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const matchTitle = a.title?.toLowerCase().includes(q);
        const matchLocation = a.location?.toLowerCase().includes(q);
        const matchDesc = a.description?.toLowerCase().includes(q);
        if (!matchTitle && !matchLocation && !matchDesc) return false;
      }

      // Enrollment status filter (only in course mode)
      if (isCourseMode && filters.enrollmentStatus && filters.enrollmentStatus !== "all") {
        const status = getEnrollmentStatus(a);
        if (status.key !== filters.enrollmentStatus) return false;
      }

      return true;
    });
  }, [activities, filters.types, filters.search, isCourseMode, filters.enrollmentStatus]);

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {isCourseMode
              ? "No hay cursos creados"
              : "No hay actividades registradas."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isCourseMode) {
    return (
      <div className="space-y-4">
        {/* Course-specific controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            {ENROLLMENT_FILTER_OPTIONS.map((f) => (
              <button
                key={f.value}
                onClick={() =>
                  filters.setEnrollmentStatus(
                    f.value === "all" ? null : f.value,
                  )
                }
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
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              onClick={() => setCourseViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                courseViewMode === "grid"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista cuadrícula"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCourseViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                courseViewMode === "list"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Vista lista"
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
          <div className="space-y-2">
            {filtered.map((a: any) => (
              <CourseListItem key={a.id} activity={a} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Standard activity list
  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No se encontraron actividades con estos filtros</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((activity: any) => (
        <ActivityListItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}
