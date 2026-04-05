import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Users, FileText } from "lucide-react";
import { useActivities } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ReunionesPage() {
  const { data, isLoading } = useActivities({ type: "MEETING", limit: "100" });
  const activities = data?.activities || [];
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return activities;
    const q = search.toLowerCase();
    return activities.filter((a: any) =>
      a.title?.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q),
    );
  }, [activities, search]);

  const now = new Date();
  const proximas = useMemo(
    () => filtered.filter((a: any) => a.startDate && new Date(a.startDate) >= now).sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [filtered],
  );
  const pasadas = useMemo(
    () => filtered.filter((a: any) => !a.startDate || new Date(a.startDate) < now).sort((a: any, b: any) => new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()),
    [filtered],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reuniones</h1>
          <p className="text-sm text-muted-foreground mt-1">Juntas, comisiones y encuentros del equipo</p>
        </div>
        <Link to="/reuniones/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />Nueva reunión
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : activities.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>No hay reuniones todavía</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Próximas */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Próximas ({proximas.length})
            </h2>
            {proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No hay reuniones próximas</p>
            ) : (
              <div className="space-y-3">
                {proximas.map((a: any) => (
                  <MeetingRow key={a.id} meeting={a} upcoming />
                ))}
              </div>
            )}
          </section>

          {/* Pasadas */}
          {pasadas.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Pasadas ({pasadas.length})
              </h2>
              <div className="space-y-3">
                {pasadas.map((a: any) => (
                  <MeetingRow key={a.id} meeting={a} upcoming={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function MeetingRow({ meeting: a, upcoming }: { meeting: any; upcoming: boolean }) {
  const date = a.startDate ? new Date(a.startDate) : null;
  const day = date ? date.getDate() : "—";
  const month = date ? date.toLocaleDateString("es-ES", { month: "short" }).toUpperCase() : "";
  const time = date ? date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "";
  const attendeeCount = a.attendees?.length || 0;
  const hasActa = a.documents?.length > 0;

  return (
    <Link to={`/reuniones/${a.id}`} className="block">
      <div className="flex items-center gap-4 rounded-lg border p-4 hover:shadow-sm hover:bg-muted/20 transition-all">
        {/* Date box */}
        <div className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center shrink-0 ${
          upcoming ? "bg-sky-100 text-sky-800" : "bg-muted text-muted-foreground"
        }`}>
          <span className="text-lg font-bold leading-none">{day}</span>
          <span className="text-[10px] font-semibold uppercase">{month}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{a.title}</h3>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {time && <span>{time}</span>}
            {a.location && <span>{a.location}</span>}
            {attendeeCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Users className="h-3 w-3" />{attendeeCount}
              </span>
            )}
          </div>
        </div>

        {/* Acta badge */}
        {!upcoming && (
          <Badge variant="outline" className={`text-xs shrink-0 ${
            hasActa ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <FileText className="h-3 w-3 mr-1" />
            {hasActa ? "Acta disponible" : "Acta pendiente"}
          </Badge>
        )}
      </div>
    </Link>
  );
}
