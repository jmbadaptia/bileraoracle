import { useMemo } from "react";
import { Link } from "react-router";
import { Plus, ChevronDown } from "lucide-react";
import { useActivities } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActivityFilters } from "./use-activity-filters";
import { FilterBar } from "./filter-bar";
import { CalendarView } from "./calendar-view";
import { ListView } from "./list-view";
import { KanbanView } from "./kanban-view";

export function ActividadesUnifiedPage() {
  const filters = useActivityFilters();
  const { data, isLoading } = useActivities(filters.apiParams);
  const activities = data?.activities || [];

  // Client-side multi-type filter for kanban (calendar and list handle their own)
  const filteredForKanban = useMemo(() => {
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

  const title = filters.enrollmentEnabled ? "Cursos y Talleres" : "Actividades";
  const subtitle = filters.enrollmentEnabled
    ? "Planifica actividades y gestiona las inscripciones"
    : "Eventos, cursos, reuniones y tareas";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
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

      {/* Views */}
      {filters.viewMode === "calendar" && <CalendarView filters={filters} />}
      {filters.viewMode === "list" && (
        <ListView
          activities={activities}
          filters={filters}
          isLoading={isLoading}
        />
      )}
      {filters.viewMode === "kanban" && (
        isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <KanbanView activities={filteredForKanban} />
        )
      )}
    </div>
  );
}
