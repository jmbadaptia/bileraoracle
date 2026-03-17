import { useState } from "react";
import { Link } from "react-router";
import { MapPin, Search, X, CalendarX } from "lucide-react";
import { useActivities, useMembers } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-100 text-blue-800 border-blue-200",
  MEETING: "bg-amber-100 text-amber-800 border-amber-200",
  EVENT: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

export function HistorialPage() {
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const { data: membersData } = useMembers({ limit: "200", active: "true" });
  const members = membersData?.members || membersData || [];

  const params: Record<string, string> = { limit: "100" };
  if (selectedUser) params.participantId = selectedUser;
  if (selectedType) params.type = selectedType;
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const { data, isLoading } = useActivities(params);
  let activities = data?.activities || [];

  // Client-side search filter
  if (search) {
    const q = search.toLowerCase();
    activities = activities.filter(
      (a: any) =>
        a.title.toLowerCase().includes(q) ||
        a.location?.toLowerCase().includes(q)
    );
  }

  const hasFilters = selectedUser || selectedType || dateFrom || dateTo || search;

  function clearFilters() {
    setSelectedUser("");
    setSelectedType("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-sm text-muted-foreground">
          Registro completo de actividades
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[140px]"
        >
          <option value="">Todas las personas</option>
          {(Array.isArray(members) ? members : []).map((m: any) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[120px]"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 w-[140px] text-sm"
          placeholder="Desde"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 w-[140px] text-sm"
          placeholder="Hasta"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="rounded-lg border divide-y">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarX className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            No se encontraron actividades
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {activities.length} resultado{activities.length !== 1 ? "s" : ""}
          </p>
          <div className="rounded-lg border divide-y">
            {activities.map((activity: any) => (
              <Link
                key={activity.id}
                to={`/actividades/${activity.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {activity.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    <span>{formatDate(activity.startDate)}</span>
                    {activity.location && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {activity.location}
                      </span>
                    )}
                    {activity.attendees && activity.attendees.length > 0 && (
                      <span>
                        {activity.attendees.map((a: any) => a.name).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[11px] ${TYPE_COLORS[activity.type] || ""}`}
                  >
                    {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
                  </Badge>
                  <StatusBadge status={activity.status} className="text-[11px]" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
