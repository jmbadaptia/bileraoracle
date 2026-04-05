import {
  Search,
  CalendarDays,
  List,
  SquareKanban,
  X,
} from "lucide-react";
import { useMembers } from "@/api/hooks";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActivityFilters, ViewMode } from "./use-activity-filters";

const VIEW_OPTIONS: { value: ViewMode; icon: typeof CalendarDays; title: string }[] = [
  { value: "calendar", icon: CalendarDays, title: "Calendario" },
  { value: "list", icon: List, title: "Lista" },
  { value: "kanban", icon: SquareKanban, title: "Kanban" },
];

export function FilterBar({ filters }: { filters: ActivityFilters }) {
  const { data: membersData } = useMembers({ limit: "200", active: "true" });
  const members: any[] = membersData?.members || membersData || [];

  return (
    <div className="space-y-3">
      {/* Row 1: Search + View toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar actividades..."
            value={filters.search}
            onChange={(e) => filters.setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border p-1 ml-auto">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => filters.setViewMode(opt.value)}
              className={`p-1.5 rounded-md transition-colors ${
                filters.viewMode === opt.value
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title={opt.title}
            >
              <opt.icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Type filters + enrollment toggle */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Tipo
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
              <Badge
                key={key}
                variant="outline"
                className={`cursor-pointer transition-colors ${
                  filters.types.has(key)
                    ? ACTIVITY_TYPE_CONFIG[key]?.color || ""
                    : "hover:bg-muted"
                }`}
                onClick={() => filters.toggleType(key)}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Inscripciones
          </Label>
          <Badge
            variant="outline"
            className={`cursor-pointer transition-colors ${
              filters.enrollmentEnabled
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted"
            }`}
            onClick={() => filters.setEnrollmentEnabled(!filters.enrollmentEnabled)}
          >
            Solo cursos
          </Badge>
        </div>

        {filters.hasFilters && (
          <Badge
            variant="outline"
            className="cursor-pointer transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            onClick={filters.clearAll}
          >
            <X className="h-3 w-3 mr-0.5" />
            Limpiar
          </Badge>
        )}
      </div>

      {/* Row 3: Participant filter (collapsible) */}
      {members.length > 0 && (
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Filtrar por persona
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {members.map((member: any) => (
              <Badge
                key={member.id}
                variant={filters.participantId === member.id ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() =>
                  filters.setParticipantId(
                    filters.participantId === member.id ? null : member.id,
                  )
                }
              >
                {member.name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
