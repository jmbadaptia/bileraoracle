import { useMemo } from "react";
import { Link } from "react-router";
import {
  Plus,
  ChevronDown,
  CalendarDays,
  List,
  SquareKanban,
} from "lucide-react";
import { useActivities } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActivityFilters, type ViewMode } from "./use-activity-filters";
import { FilterBar } from "./filter-bar";
import { CalendarView } from "./calendar-view";
import { ListView } from "./list-view";
import { KanbanView } from "./kanban-view";

const VIEW_TABS: { value: ViewMode; icon: typeof CalendarDays; label: string }[] = [
  { value: "calendar", icon: CalendarDays, label: "Calendario" },
  { value: "kanban", icon: SquareKanban, label: "Kanban" },
  { value: "list", icon: List, label: "Lista" },
];

export function ActividadesUnifiedPage() {
  const filters = useActivityFilters();
  const { data, isLoading } = useActivities(filters.apiParams);
  const activities = data?.activities || [];

  // Client-side multi-type + search filter for kanban
  const filteredActivities = useMemo(() => {
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

  const title = "Actividades";

  return (
    <div className="space-y-5">
      {/* Header: Title + View tabs + New button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <div className="hidden sm:flex items-center rounded-lg border bg-muted/50 p-0.5">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => filters.setViewMode(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  filters.viewMode === tab.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
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

      {/* Mobile view tabs */}
      <div className="flex sm:hidden items-center rounded-lg border bg-muted/50 p-0.5">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => filters.setViewMode(tab.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filters.viewMode === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Toolbar: Search + dropdown filters */}
      <FilterBar filters={filters} />

      {/* Views */}
      {filters.viewMode === "calendar" && <CalendarView filters={filters} />}
      {filters.viewMode === "list" && (
        <ListView
          activities={filteredActivities}
          filters={filters}
          isLoading={isLoading}
        />
      )}
      {filters.viewMode === "kanban" && (
        isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <KanbanView activities={filteredActivities} mode="activities" />
        )
      )}
    </div>
  );
}
