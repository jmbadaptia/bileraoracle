import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  Plus,
  CalendarDays,
  MapPin,
  List,
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
import { useActivities, useActivitiesForCalendar } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---- Calendar helpers ----

const TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-100 text-blue-800 border-blue-200",
  MEETING: "bg-amber-100 text-amber-800 border-amber-200",
  EVENT: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

interface CalendarActivity {
  id: string;
  title: string;
  type: string;
  startDate: string;
  attendees: { id: string; name: string }[];
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

// ---- Calendar View ----

function CalendarView({
  currentDate,
  setCurrentDate,
}: {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}) {
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
      const dayKey = format(new Date(activity.startDate), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)!.push(activity);
    }

    for (const [, list] of map) {
      list.sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
      );
    }

    return map;
  }, [data]);

  return (
    <div>
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

// ---- List View ----

function ListView() {
  const { data, isLoading } = useActivities();
  const activities = data?.activities || [];

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando...</p>;
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No hay actividades registradas.
          </p>
          <Link to="/actividades/nueva" className="mt-4">
            <Button variant="outline">Registrar primera actividad</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity: any) => (
        <Link key={activity.id} to={`/actividades/${activity.id}`}>
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
      ))}
    </div>
  );
}

// ---- Main Page ----

export function ActividadesPage() {
  const [activeTab, setActiveTab] = useState("calendar");
  const [currentDate, setCurrentDate] = useState(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Actividades</h1>
          <p className="text-muted-foreground">
            Registro de reuniones, visitas y eventos
          </p>
        </div>
        <Link to="/actividades/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Actividad
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Calendario
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-1.5" />
              Lista
            </TabsTrigger>
          </TabsList>

          {activeTab === "calendar" && (
            <>
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
                      className={`w-3 h-3 rounded-sm border ${TYPE_COLORS[type] || TYPE_COLORS.OTHER}`}
                    />
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <TabsContent value="calendar">
          <CalendarView currentDate={currentDate} setCurrentDate={setCurrentDate} />
        </TabsContent>
        <TabsContent value="list">
          <ListView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
