import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";
import {
  Plus,
  MapPin,
  CalendarDays,
  X,
  GripVertical,
  CircleCheck,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useActivities, useMembers, useUpdateActivityStatus } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { AvatarGroup } from "@/components/ui/avatar-group";

const TYPE_COLORS: Record<string, string> = {
  TASK: "bg-blue-100 text-blue-800 border-blue-200",
  MEETING: "bg-amber-100 text-amber-800 border-amber-200",
  EVENT: "bg-purple-100 text-purple-800 border-purple-200",
  OTHER: "bg-gray-100 text-gray-800 border-gray-200",
};

const STATUS_COLUMNS = [
  { id: "PENDING", label: "Por Hacer", color: "border-t-yellow-400" },
  { id: "IN_PROGRESS", label: "En Progreso", color: "border-t-blue-400" },
  { id: "DONE", label: "Hecho", color: "border-t-green-400" },
] as const;

interface ActivityCard {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  dueDate?: string;
  location?: string;
  ownerName: string;
  description?: string;
  attendees?: { id: string; name: string }[];
  tags?: { id: string; name: string; color: string }[];
}

function KanbanCardContent({
  activity,
  onMarkDone,
}: {
  activity: ActivityCard;
  onMarkDone?: (e: React.MouseEvent) => void;
}) {
  return (
    <CardContent className="p-3">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground/40 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h4 className="text-sm font-medium leading-tight truncate">
              {activity.title}
            </h4>
            {onMarkDone && activity.status !== "DONE" && (
              <button
                type="button"
                title="Marcar como hecho"
                onClick={onMarkDone}
                className="shrink-0 text-muted-foreground/40 hover:text-green-600 transition-colors"
              >
                <CircleCheck className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[activity.type] || ""}`}
            >
              {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <CalendarDays className="h-3 w-3" />
              {formatDate(activity.startDate)}
            </span>
            {activity.location && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {activity.location}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[11px] text-muted-foreground">
              {activity.ownerName}
            </p>
            <AvatarGroup people={activity.attendees || []} max={3} size="sm" />
          </div>
          {activity.dueDate && (
            <p className="text-[10px] text-orange-600 mt-0.5">
              Límite: {formatDate(activity.dueDate)}
            </p>
          )}
        </div>
      </div>
    </CardContent>
  );
}

function DraggableCard({
  activity,
  onMarkDone,
}: {
  activity: ActivityCard;
  onMarkDone: (id: string) => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: activity.id });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-30" : ""}
      onClick={() => navigate(`/actividades/${activity.id}`)}
    >
      <Card className="hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer">
        <KanbanCardContent
          activity={activity}
          onMarkDone={(e) => {
            e.stopPropagation();
            onMarkDone(activity.id);
          }}
        />
      </Card>
    </div>
  );
}

function DroppableColumn({
  status,
  label,
  color,
  activities,
  onMarkDone,
}: {
  status: string;
  label: string;
  color: string;
  activities: ActivityCard[];
  onMarkDone: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border-t-4 ${color} bg-muted/30 min-h-[300px] ${
        isOver ? "ring-2 ring-primary/30 bg-muted/50" : ""
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="secondary" className="text-xs">
          {activities.length}
        </Badge>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {activities.map((activity) => (
          <DraggableCard key={activity.id} activity={activity} onMarkDone={onMarkDone} />
        ))}
        {activities.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Sin actividades
          </p>
        )}
      </div>
    </div>
  );
}

export function TareasPage() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const { data: membersData } = useMembers({ limit: "200", active: "true" });
  const members = membersData?.members || membersData || [];

  const params: Record<string, string> = { limit: "500" };
  if (selectedUser) params.participantId = selectedUser;

  const { data, isLoading } = useActivities(params);
  const updateStatus = useUpdateActivityStatus();
  const allActivities: ActivityCard[] = useMemo(() => {
    const list: ActivityCard[] = data?.activities || [];
    if (selectedTypes.size === 0) return list;
    return list.filter((a) => selectedTypes.has(a.type));
  }, [data, selectedTypes]);

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columns = useMemo(() => {
    const map: Record<string, ActivityCard[]> = {
      PENDING: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const activity of allActivities) {
      const status = activity.status || "PENDING";
      if (map[status]) {
        map[status].push(activity);
      } else {
        map.PENDING.push(activity);
      }
    }
    return map;
  }, [allActivities]);

  const activeActivity = activeId
    ? allActivities.find((a) => a.id === activeId)
    : null;

  const hasFilters = selectedUser || selectedTypes.size > 0;

  function toggleType(key: string) {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activityId = active.id as string;
    const newStatus = over.id as string;

    // Only process drops on column droppables (not other cards)
    if (!["PENDING", "IN_PROGRESS", "DONE"].includes(newStatus)) return;

    const activity = allActivities.find((a) => a.id === activityId);
    if (!activity || activity.status === newStatus) return;

    updateStatus.mutate({ id: activityId, status: newStatus });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
          <p className="text-muted-foreground">
            Tablero Kanban de actividades
          </p>
        </div>
        <Link to="/actividades/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Actividad
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
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
                    selectedTypes.has(key)
                      ? TYPE_COLORS[key]
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleType(key)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {hasFilters && (
            <Badge
              variant="outline"
              className="cursor-pointer transition-colors hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              onClick={() => {
                setSelectedUser(null);
                setSelectedTypes(new Set());
              }}
            >
              <X className="h-3 w-3 mr-0.5" />
              Limpiar
            </Badge>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUS_COLUMNS.map((col) => (
              <DroppableColumn
                key={col.id}
                status={col.id}
                label={col.label}
                color={col.color}
                activities={columns[col.id] || []}
                onMarkDone={(id) => updateStatus.mutate({ id, status: "DONE" })}
              />
            ))}
          </div>

          <DragOverlay>
            {activeActivity ? (
              <div className="w-72 opacity-90">
                <Card>
                  <KanbanCardContent activity={activeActivity} />
                </Card>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
