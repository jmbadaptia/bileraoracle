import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { CalendarDays } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const STATUS_COLUMNS = [
  { id: "PENDING", label: "Pendiente", color: "border-t-amber-400", dotColor: "bg-amber-400" },
  { id: "IN_PROGRESS", label: "En progreso", color: "border-t-blue-400", dotColor: "bg-blue-400" },
  { id: "DONE", label: "Completado", color: "border-t-emerald-400", dotColor: "bg-emerald-400" },
] as const;

// Map type to left-border color
const TYPE_BORDER: Record<string, string> = {
  TASK: "border-l-blue-400",
  MEETING: "border-l-amber-400",
  EVENT: "border-l-purple-400",
  OTHER: "border-l-gray-400",
};

interface ActivityCard {
  id: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  enrollmentEnabled?: boolean;
}

function CardContent({ activity }: { activity: ActivityCard }) {
  const borderColor = TYPE_BORDER[activity.type] || TYPE_BORDER.OTHER;

  return (
    <div
      className={`rounded-lg border border-l-[3px] ${borderColor} bg-background p-3 hover:shadow-md transition-shadow cursor-pointer`}
    >
      <h4 className="text-sm font-medium leading-snug line-clamp-2">
        {activity.title}
      </h4>
      <div className="flex items-center gap-2 mt-2">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${ACTIVITY_TYPE_CONFIG[activity.type]?.color || ""}`}
        >
          {ACTIVITY_TYPE_LABELS[activity.type] || activity.type}
        </Badge>
        {activity.startDate && (
          <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
            <CalendarDays className="h-3 w-3" />
            {formatDate(activity.startDate)}
          </span>
        )}
      </div>
    </div>
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
      <CardContent activity={activity} />
    </div>
  );
}

function DroppableColumn({
  status,
  label,
  color,
  dotColor,
  activities,
  onMarkDone,
}: {
  status: string;
  label: string;
  color: string;
  dotColor: string;
  activities: ActivityCard[];
  onMarkDone: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border-t-[3px] ${color} bg-muted/20 min-h-[300px] ${
        isOver ? "ring-2 ring-primary/20 bg-muted/40" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        <h3 className="text-sm font-medium">{label}</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {activities.length}
        </span>
      </div>
      <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
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
    ? activities.find((a: any) => a.id === activeId)
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

    const activity = activities.find((a: any) => a.id === activityId);
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
            dotColor={col.dotColor}
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
            <CardContent activity={activeActivity} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
