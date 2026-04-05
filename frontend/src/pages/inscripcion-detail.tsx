import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  Pencil, CalendarDays, MapPin, Users, Copy, Shuffle, Check, X,
  Clock, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  useActivity, useEnrollments, useCancelEnrollment,
  useConfirmEnrollment, useRunLottery, useUpdateActivity,
} from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-blue-100 text-blue-700",
  WAITLISTED: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmada",
  PENDING: "Pendiente",
  WAITLISTED: "En espera",
  CANCELLED: "Cancelada",
};

export function InscripcionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: activity, isLoading } = useActivity(id || "");
  const { data: enrollData, isLoading: enrollLoading } = useEnrollments(id || "");
  const cancelEnrollment = useCancelEnrollment(id || "");
  const confirmEnrollment = useConfirmEnrollment(id || "");
  const runLottery = useRunLottery(id || "");
  const [copied, setCopied] = useState(false);
  const updateActivity = useUpdateActivity(id || "");
  const [statusFilter, setStatusFilter] = useState("active");

  function handleTogglePublish() {
    const isPublished = activity?.status === "PUBLISHED" || activity?.status === "FINISHED";
    const newStatus = isPublished ? "DRAFT" : "PUBLISHED";
    updateActivity.mutate(
      { ...activity, status: newStatus, publishStatus: newStatus, publishDate: null },
      {
        onSuccess: () => toast.success(newStatus === "PUBLISHED" ? "Publicada" : "Despublicada"),
        onError: (err: any) => toast.error(err?.message || "Error"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!activity) {
    return <p className="text-muted-foreground">Curso no encontrado</p>;
  }

  const publicUrl = `${window.location.origin}/inscribirse/${activity.id}`;
  const deadlinePassed = activity.enrollmentDeadline && new Date(activity.enrollmentDeadline) < new Date();
  const isFull = activity.maxCapacity && (activity.enrollmentCount || 0) >= activity.maxCapacity;
  const isOpen = !deadlinePassed && !(activity.enrollmentMode === "FIFO" && isFull);

  const stats = enrollData?.stats || { CONFIRMED: 0, PENDING: 0, WAITLISTED: 0, CANCELLED: 0 };
  const enrollments = enrollData?.enrollments || [];

  const filtered = statusFilter === "active"
    ? enrollments.filter((e: any) => e.status !== "CANCELLED")
    : statusFilter === "all"
    ? enrollments
    : enrollments.filter((e: any) => e.status === statusFilter);

  function handleCopyLink() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Enlace copiado");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLottery() {
    if (!confirm("Realizar el sorteo? Esta accion asignara las plazas aleatoriamente.")) return;
    runLottery.mutate(undefined, {
      onSuccess: (res: any) => toast.success(`Sorteo realizado: ${res.confirmed} confirmadas, ${res.waitlisted} en espera`),
      onError: (err: any) => toast.error(err?.message || "Error"),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{activity.title}</h1>
            {activity.status === "DRAFT" || activity.status === "IN_REVIEW" && (
              <Badge variant="outline" className="text-xs">Borrador</Badge>
            )}
          </div>
          {activity.description && (
            <p className="text-muted-foreground mt-1">{activity.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
            {activity.startDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(activity.startDate).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {activity.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {activity.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button
                variant={activity.status === "PUBLISHED" || activity.status === "FINISHED" ? "outline" : "default"}
                size="sm"
                onClick={handleTogglePublish}
                disabled={updateActivity.isPending}
              >
                {activity.status === "PUBLISHED" || activity.status === "FINISHED" ? (
                  <><EyeOff className="h-3.5 w-3.5 mr-1.5" />Despublicar</>
                ) : (
                  <><Eye className="h-3.5 w-3.5 mr-1.5" />Publicar</>
                )}
              </Button>
              <Link to={`/actividades/curso/${activity.id}/editar`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />
                  Editar
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{stats.CONFIRMED}</p>
            <p className="text-xs text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{stats.PENDING}</p>
            <p className="text-xs text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{stats.WAITLISTED}</p>
            <p className="text-xs text-muted-foreground">En espera</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{activity.maxCapacity || "-"}</p>
            <p className="text-xs text-muted-foreground">Plazas totales</p>
          </CardContent>
        </Card>
      </div>

      {/* Info badges + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant={isOpen ? "default" : "secondary"}>
          {isOpen ? "Inscripciones abiertas" : "Inscripciones cerradas"}
        </Badge>
        <Badge variant="outline">
          {activity.enrollmentMode === "LOTTERY" ? "Sorteo" : "Por orden de inscripcion"}
        </Badge>
        {activity.enrollmentPrice > 0 && (
          <Badge variant="outline">{activity.enrollmentPrice.toFixed(2)}€</Badge>
        )}
        {activity.enrollmentDeadline && (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Limite: {new Date(activity.enrollmentDeadline).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </Badge>
        )}

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="ml-1.5">{copied ? "Copiado" : "Copiar enlace"}</span>
          </Button>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Ver pagina
            </Button>
          </a>
        </div>
      </div>

      {/* Lottery button */}
      {activity.enrollmentMode === "LOTTERY" && stats.PENDING > 0 && (
        <Button onClick={handleLottery} disabled={runLottery.isPending}>
          <Shuffle className="h-4 w-4 mr-2" />
          Realizar sorteo ({stats.PENDING} pendientes)
        </Button>
      )}

      {/* Enrollments table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Inscritos
            </CardTitle>
            <div className="flex gap-1 overflow-x-auto no-scrollbar">
              {["active", "CONFIRMED", "WAITLISTED", "PENDING", "CANCELLED", "all"].map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "text-xs px-2 py-1 rounded-md transition-colors whitespace-nowrap shrink-0",
                    statusFilter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  {f === "active" ? "Activas" : f === "all" ? "Todas" : STATUS_LABELS[f]}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {enrollLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No hay inscripciones</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{e.name}</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_COLORS[e.status])}>
                        {STATUS_LABELS[e.status]}
                      </span>
                      <span className="text-xs text-muted-foreground">#{e.position}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {e.email}{e.phone ? ` · ${e.phone}` : ""}
                      {e.enrolledAt && ` · ${new Date(e.enrolledAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {e.status !== "CONFIRMED" && e.status !== "CANCELLED" && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => confirmEnrollment.mutate(e.id, {
                          onSuccess: () => toast.success("Confirmada"),
                          onError: (err: any) => toast.error(err?.message || "Error"),
                        })}
                      >
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                    )}
                    {e.status !== "CANCELLED" && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => {
                          if (!confirm(`Cancelar la inscripcion de ${e.name}?`)) return;
                          cancelEnrollment.mutate(e.id, {
                            onSuccess: () => toast.success("Cancelada"),
                            onError: (err: any) => toast.error(err?.message || "Error"),
                          });
                        }}
                      >
                        <X className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
