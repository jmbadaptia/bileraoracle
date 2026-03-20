import { Link } from "react-router";
import { Plus, CalendarDays, MapPin, Users, Clock, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useActivities } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function InscripcionesPage() {
  const { data, isLoading } = useActivities({ enrollmentEnabled: "1", limit: "50" });
  const activities = data?.activities || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cursos y Talleres</h1>
          <p className="text-muted-foreground">Actividades con inscripcion publica</p>
        </div>
        <Link to="/inscripciones/nueva">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay cursos creados</p>
              <p className="text-sm mt-1">Crea un curso o taller para que la gente pueda inscribirse</p>
              <Link to="/inscripciones/nueva">
                <Button variant="outline" className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer curso
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activities.map((a: any) => {
            const deadlinePassed = a.enrollmentDeadline && new Date(a.enrollmentDeadline) < new Date();
            const isFull = a.maxCapacity && (a.enrollmentCount || 0) >= a.maxCapacity;
            const isOpen = !deadlinePassed && !(a.enrollmentMode === "FIFO" && isFull);

            return (
              <div key={a.id} className="relative group">
              <Link to={`/inscripciones/${a.id}`}>
                <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base">{a.title}</h3>
                      <div className="flex gap-1.5 shrink-0">
                        {a.publishStatus === "DRAFT" && (
                          <Badge variant="outline" className="text-xs">Borrador</Badge>
                        )}
                        <Badge variant={isOpen ? "default" : "secondary"} className="text-xs">
                          {isOpen ? "Abierta" : "Cerrada"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {a.startDate && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(a.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                        </span>
                      )}
                      {a.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {a.location}
                        </span>
                      )}
                      {a.maxCapacity && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {a.enrollmentCount || 0}/{a.maxCapacity}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {a.enrollmentPrice > 0 && (
                        <Badge variant="outline" className="text-xs">{a.enrollmentPrice.toFixed(2)}€</Badge>
                      )}
                      {a.enrollmentMode === "LOTTERY" && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="h-3 w-3" />
                          Sorteo
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(`${window.location.origin}/inscribirse/${a.id}`);
                  toast.success("Enlace publico copiado");
                }}
                className="absolute top-3 right-3 h-7 w-7 rounded-lg bg-background/90 border shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted z-10"
                title="Copiar enlace publico"
              >
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
