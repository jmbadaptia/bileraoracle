import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  MapPin,
  CalendarDays,
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
import { useUpdateActivityStatus } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarGroup } from "@/components/ui/avatar-group";

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
  enrollmentEnabled?: boolean;
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
              className={`text-[10px] px-1.5 py-0 ${ACTIVITY_TYPE_CONFIG[activity.type]?.color || ""}`}
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

  const link = activity.enrollmentEnabled
    ? `/actividades/curso/${activity.id}`
    : `/actividades/${activity.id}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? "opacity-30" : ""}
      onClick={() => navigate(link)}
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
          <DraggableCard
            key={activity.id}
            activity={activity}
            onMarkDone={onMarkDone}
          />
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

export function KanbanView({ activities }: { activities: any[] }) {
  const updateStatus = useUpdateActivityStatus();
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const columns = useMemo(() => {
    const map: Record<string, ActivityCard[]> = {
      PENDING: [],
      IN_PROGRESS: [],
      DONE: [],
    };
    for (const activity of activities) {
      const status = activity.status || "PENDING";
      if (map[status]) {
        map[status].push(activity);
      } else {
        map.PENDING.push(activity);
      }
    }
    return map;
  }, [activities]);

  const activeActivity = activeId
    ? activities.find((a) => a.id === activeId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activityId = active.id as string;
    const newStatus = over.id as string;

    if (!["PENDING", "IN_PROGRESS", "DONE"].includes(newStatus)) return;

    const activity = activities.find((a) => a.id === activityId);
    if (!activity || activity.status === newStatus) return;

    updateStatus.mutate({ id: activityId, status: newStatus });
  }

  return (
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
            onMarkDone={(id) =>
              updateStatus.mutate({ id, status: "DONE" })
            }
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
  );
}
