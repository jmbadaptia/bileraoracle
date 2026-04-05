import { useState, useMemo } from "react";
import { Link } from "react-router";
import { Plus, SquareKanban, List, Search, ArrowUpDown } from "lucide-react";
import { useActivities, useMembers } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_STATUS_LABELS, ACTIVITY_STATUS_CONFIG, PRIORITY_CONFIG, PRIORITY_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanView } from "./actividades-unified/kanban-view";

type ViewMode = "kanban" | "list";

export function TareasPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [participantFilter, setParticipantFilter] = useState<string | null>(null);

  const params: Record<string, string> = { type: "TASK", limit: "500" };
  if (participantFilter) params.participantId = participantFilter;

  const { data, isLoading } = useActivities(params);
  const { data: membersData } = useMembers({ limit: "200", active: "true" });
  const members: any[] = membersData?.members || membersData || [];
  const activities = data?.activities || [];

  const filtered = useMemo(() => {
    return activities.filter((a: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (!a.title?.toLowerCase().includes(q) && !a.description?.toLowerCase().includes(q)) return false;
      }
      if (priorityFilter && a.priority !== priorityFilter) return false;
      return true;
    });
  }, [activities, search, priorityFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight">Tareas</h1>
          <div className="hidden sm:flex items-center rounded-lg border bg-muted/50 p-0.5">
            <button
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "kanban" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SquareKanban className="h-4 w-4" />Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-4 w-4" />Lista
            </button>
          </div>
        </div>
        <Link to="/tareas/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />Nueva tarea
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={priorityFilter || "_all"} onValueChange={(v) => setPriorityFilter(v === "_all" ? null : v)}>
          <SelectTrigger className="w-auto min-w-[130px] h-9">
            <span className="text-muted-foreground mr-1">Prioridad:</span>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {members.length > 0 && (
          <Select value={participantFilter || "_all"} onValueChange={(v) => setParticipantFilter(v === "_all" ? null : v)}>
            <SelectTrigger className="w-auto min-w-[150px] h-9">
              <span className="text-muted-foreground mr-1">Persona:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Todas</SelectItem>
              {members.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Views */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : viewMode === "kanban" ? (
        <KanbanView activities={filtered} />
      ) : (
        <TaskTable activities={filtered} />
      )}
    </div>
  );
}

function TaskTable({ activities }: { activities: any[] }) {
  const [sortField, setSortField] = useState<"title" | "priority" | "startDate" | "status">("startDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return [...activities].sort((a, b) => {
      let cmp = 0;
      if (sortField === "title") cmp = (a.title || "").localeCompare(b.title || "");
      else if (sortField === "startDate") cmp = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
      else if (sortField === "priority") cmp = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      else if (sortField === "status") cmp = (a.status || "").localeCompare(b.status || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [activities, sortField, sortDir]);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortHeader({ field, children }: { field: typeof sortField; children: React.ReactNode }) {
    return (
      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 cursor-pointer select-none hover:text-foreground transition-colors"
        onClick={() => toggleSort(field)}>
        <span className="inline-flex items-center gap-1">
          {children}
          <ArrowUpDown className={`h-3 w-3 ${sortField === field ? "text-foreground" : "text-muted-foreground/40"}`} />
        </span>
      </th>
    );
  }

  if (activities.length === 0) {
    return <p className="text-center py-12 text-muted-foreground">No hay tareas</p>;
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <SortHeader field="title">Título</SortHeader>
            <SortHeader field="priority">Prioridad</SortHeader>
            <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Responsable</th>
            <SortHeader field="startDate">Fecha</SortHeader>
            <SortHeader field="status">Estado</SortHeader>
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((a: any) => {
            const priorityCfg = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.MEDIUM;
            const statusCfg = ACTIVITY_STATUS_CONFIG[a.status];
            return (
              <tr key={a.id} className="hover:bg-muted/30 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <Link to={`/tareas/${a.id}`} className="text-sm font-medium hover:text-primary transition-colors">
                    {a.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className={`w-2 h-2 rounded-full ${priorityCfg.dot}`} />
                    {priorityCfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.ownerName || "—"}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{a.startDate ? formatDate(a.startDate) : "—"}</td>
                <td className="px-4 py-3">
                  {statusCfg && <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
