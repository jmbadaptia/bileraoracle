import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  CalendarDays,
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
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { useActivitiesForCalendar } from "@/api/hooks";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { ActivityFilters } from "./use-activity-filters";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarActivity {
  id: string;
  title: string;
  type: string;
  startDate: string;
  attendees: { id: string; name: string }[];
  enrollmentEnabled?: boolean;
}

function ActivityPill({ activity }: { activity: CalendarActivity }) {
  const colors = ACTIVITY_TYPE_CONFIG[activity.type]?.color || ACTIVITY_TYPE_CONFIG.OTHER?.color || "";
  const attendeeCount = activity.attendees?.length || 0;
  const link = activity.enrollmentEnabled
    ? `/actividades/curso/${activity.id}`
    : `/actividades/${activity.id}`;

  return (
    <Link
      to={link}
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

export function CalendarView({ filters }: { filters: ActivityFilters }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const from = format(calendarStart, "yyyy-MM-dd");
  const to = format(calendarEnd, "yyyy-MM-dd");

  // Build extra params from filters
  const extraParams: Record<string, string> = {};
  if (filters.types.size === 1) extraParams.type = [...filters.types][0];
  if (filters.participantId) extraParams.participantId = filters.participantId;
  if (filters.enrollmentEnabled) extraParams.enrollmentEnabled = "1";

  const { data } = useActivitiesForCalendar(from, to, extraParams);

  const activitiesByDay = useMemo(() => {
    const map = new Map<string, CalendarActivity[]>();
    let activities: CalendarActivity[] = data?.activities || [];

    // Client-side multi-type filter (API only supports single type)
    if (filters.types.size > 1) {
      activities = activities.filter((a) => filters.types.has(a.type));
    }

    // Client-side search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      activities = activities.filter((a) =>
        a.title.toLowerCase().includes(q),
      );
    }

    for (const activity of activities) {
      const dayKey = format(new Date(activity.startDate), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(activity);
    }

    for (const [, list] of map) {
      list.sort(
        (a, b) =>
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      );
    }

    return map;
  }, [data, filters.types, filters.search]);

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
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

        <div className="flex flex-wrap gap-3 text-xs ml-auto">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-sm border ${ACTIVITY_TYPE_CONFIG[type]?.color || ""}`}
              />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="border rounded-lg overflow-hidden">
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
