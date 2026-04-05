import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import { useActivitiesForCalendar } from "@/api/hooks";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Layer toggle config
const LAYERS = [
  { key: "activities", label: "Actividades", types: ["EVENT", "TALLER", "OTHER"], dotColor: "bg-emerald-500", activeColor: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { key: "tasks", label: "Tareas", types: ["TASK"], dotColor: "bg-blue-500", activeColor: "bg-blue-100 text-blue-800 border-blue-300" },
  { key: "meetings", label: "Reuniones", types: ["MEETING"], dotColor: "bg-sky-500", activeColor: "bg-sky-100 text-sky-800 border-sky-300" },
] as const;

interface CalendarActivity {
  id: string;
  title: string;
  type: string;
  startDate: string;
  enrollmentEnabled?: boolean;
}

function getLink(activity: CalendarActivity) {
  if (activity.enrollmentEnabled) return `/actividades/curso/${activity.id}`;
  if (activity.type === "TASK") return `/tareas/${activity.id}`;
  if (activity.type === "MEETING") return `/reuniones/${activity.id}`;
  return `/actividades/${activity.id}`;
}

function ActivityPill({ activity }: { activity: CalendarActivity }) {
  const colors = ACTIVITY_TYPE_CONFIG[activity.type]?.color || ACTIVITY_TYPE_CONFIG.OTHER?.color || "";

  return (
    <Link
      to={getLink(activity)}
      className={`block text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${colors} hover:opacity-80 transition-opacity`}
      title={activity.title}
    >
      <span className="font-medium">{activity.title}</span>
    </Link>
  );
}

export function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(["activities", "tasks", "meetings"]));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const from = format(calendarStart, "yyyy-MM-dd");
  const to = format(calendarEnd, "yyyy-MM-dd");
  const { data } = useActivitiesForCalendar(from, to);

  // Compute which types are visible based on active layers
  const visibleTypes = useMemo(() => {
    const types = new Set<string>();
    for (const layer of LAYERS) {
      if (activeLayers.has(layer.key)) {
        for (const t of layer.types) types.add(t);
      }
    }
    return types;
  }, [activeLayers]);

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    const all: CalendarActivity[] = data?.activities || [];
    const filtered = all.filter(a => visibleTypes.has(a.type));

    for (const activity of filtered) {
      const dayKey = format(new Date(activity.startDate), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(activity);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
    return map;
  }, [data, visibleTypes]);

  function toggleLayer(key: string) {
    setActiveLayers(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
          <p className="text-sm text-muted-foreground">Vista unificada de actividades, tareas y reuniones</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subMonths(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addMonths(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex items-center gap-2">
        {LAYERS.map(layer => {
          const active = activeLayers.has(layer.key);
          return (
            <button
              key={layer.key}
              onClick={() => toggleLayer(layer.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                active ? layer.activeColor : "border-muted-foreground/20 text-muted-foreground/50 hover:text-muted-foreground"
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${active ? layer.dotColor : "bg-muted-foreground/30"}`} />
              {layer.label}
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50">
          {WEEKDAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2 border-b">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayActivities = activitiesByDay.get(dayKey) || [];
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);
            const maxVisible = 3;
            const overflow = dayActivities.length - maxVisible;

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r p-1 ${
                  !inMonth ? "bg-muted/30" : ""
                } ${i % 7 === 0 ? "border-l-0" : ""}`}
              >
                <div className="flex justify-between items-start mb-0.5">
                  <span
                    className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                      today
                        ? "bg-primary text-primary-foreground"
                        : !inMonth
                          ? "text-muted-foreground/50"
                          : "text-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayActivities.slice(0, maxVisible).map(activity => (
                    <ActivityPill key={activity.id} activity={activity} />
                  ))}
                  {overflow > 0 && (
                    <p className="text-[10px] text-muted-foreground pl-1">
                      +{overflow} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
