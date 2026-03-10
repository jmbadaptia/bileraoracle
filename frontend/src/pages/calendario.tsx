import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { useActivitiesForCalendar } from "@/api/hooks";

const TYPE_COLORS: Record<string, string> = {
  MEETING: "bg-blue-100 text-blue-800 border-blue-200",
  VISIT: "bg-green-100 text-green-800 border-green-200",
  EVENT: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarActivity {
  id: string;
  title: string;
  type: string;
  date: string;
  location?: string | null;
  attendees: { member: { id: string; name: string } }[];
}

function ActivityPill({ activity }: { activity: CalendarActivity }) {
  const colors = TYPE_COLORS[activity.type] || TYPE_COLORS.OTHER;
  const attendeeCount = activity.attendees?.length || 0;

  return (
    <Link
      to={`/actividades/${activity.id}`}
      className={`block text-[11px] leading-tight px-1.5 py-0.5 rounded border truncate ${colors} hover:opacity-80 transition-opacity`}
      title={`${activity.title} — ${ACTIVITY_TYPE_LABELS[activity.type] || activity.type}`}
    >
      <span className="font-medium">{activity.title}</span>
      {attendeeCount > 0 && (
        <span className="ml-1 inline-flex items-center gap-0.5 opacity-70">
          <Users className="h-2.5 w-2.5 inline" />
          {attendeeCount}
        </span>
      )}
    </Link>
  );
}

export function CalendarioPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const from = format(calendarStart, "yyyy-MM-dd");
  const to = format(calendarEnd, "yyyy-MM-dd");
  const { data } = useActivitiesForCalendar(from, to);

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    const activities: CalendarActivity[] = data?.activities || [];

    for (const activity of activities) {
      const dayKey = format(new Date(activity.date), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(activity);
    }

    // Sort each day's activities by time
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    return map;
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendario</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoy
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate((d) => subMonths(d, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[140px] text-center capitalize">
            {format(currentDate, "MMMM yyyy", { locale: es })}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentDate((d) => addMonths(d, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span
              className={`w-3 h-3 rounded-sm border ${TYPE_COLORS[type] || TYPE_COLORS.OTHER}`}
            />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-muted/50">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-muted-foreground py-2 border-b"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
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
                  {dayActivities.slice(0, maxVisible).map((activity) => (
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
