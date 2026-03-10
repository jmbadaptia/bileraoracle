import { useState } from "react";
import { Link } from "react-router";
import { MapPin, ChevronDown, ChevronUp, X } from "lucide-react";
import { useActivities, useMembers } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPE_COLORS: Record<string, string> = {
  PLENARY: "bg-blue-100 text-blue-800 border-blue-200",
  COMMISSION: "bg-green-100 text-green-800 border-green-200",
  MEETING: "bg-amber-100 text-amber-800 border-amber-200",
  VISIT: "bg-teal-100 text-teal-800 border-teal-200",
  EVENT: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

export function HistorialPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const { data: membersData } = useMembers({ limit: "200", active: "true" });
  const members = membersData?.members || membersData || [];

  // Build query params
  const params: Record<string, string> = { limit: "100" };
  if (selectedUser) params.participantId = selectedUser;
  if (selectedType) params.type = selectedType;
  if (dateFrom) params.from = dateFrom;
  if (dateTo) params.to = dateTo;

  const { data, isLoading } = useActivities(params);
  const activities = data?.activities || [];

  const hasFilters = selectedUser || selectedType || dateFrom || dateTo;

  function clearFilters() {
    setSelectedUser(null);
    setSelectedType(null);
    setDateFrom("");
    setDateTo("");
  }

  function toggleNotes(id: string) {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
        <p className="text-muted-foreground">
          Registro completo de actividades del equipo
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* User badges */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">
            Filtrar por persona
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {(Array.isArray(members) ? members : []).map((member: any) => (
              <Badge
                key={member.id}
                variant={selectedUser === member.id ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() =>
                  setSelectedUser(
                    selectedUser === member.id ? null : member.id
                  )
                }
              >
                {member.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Type + Date filters */}
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Tipo
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
                <Badge
                  key={key}
                  variant="outline"
                  className={`cursor-pointer transition-colors ${
                    selectedType === key
                      ? TYPE_COLORS[key]
                      : "hover:bg-muted"
                  }`}
                  onClick={() =>
                    setSelectedType(selectedType === key ? null : key)
                  }
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div>
              <Label htmlFor="from" className="text-xs text-muted-foreground mb-2 block">
                Desde
              </Label>
              <Input
                id="from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="to" className="text-xs text-muted-foreground mb-2 block">
                Hasta
              </Label>
              <Input
                id="to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground"
            >
              <X className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No se encontraron actividades con los filtros seleccionados.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {data?.total || activities.length} actividades
          </p>
          {activities.map((activity: any) => (
            <Card key={activity.id} className="overflow-hidden py-0 gap-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/actividades/${activity.id}`}
                      className="hover:underline leading-none"
                    >
                      <h3 className="font-medium text-sm leading-none">
                        {activity.title}
                      </h3>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span>{formatDate(activity.date)}</span>
                      {activity.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" />
                          {activity.location}
                        </span>
                      )}
                    </div>

                    {/* Participants */}
                    {activity.attendees && activity.attendees.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.attendees.map((a: any) => (
                          <Badge
                            key={a.user.id}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {a.user.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${TYPE_COLORS[activity.type] || ""}`}
                  >
                    {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
                  </Badge>
                </div>

                {/* Notes */}
                {activity.notes && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleNotes(activity.id);
                      }}
                      className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      {expandedNotes.has(activity.id) ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      Notas / Acta
                    </button>
                    {expandedNotes.has(activity.id) && (
                      <div
                        className="mt-2 p-3 rounded-md bg-muted/50 text-sm [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:mb-0.5 [&_strong]:font-semibold [&_a]:underline"
                        dangerouslySetInnerHTML={{ __html: activity.notes }}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
