import { useParams, Link } from "react-router";
import { Pencil, MapPin, Users, CalendarCheck, Clock } from "lucide-react";
import { useSpace } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EspacioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: space, isLoading } = useSpace(id!);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!space) {
    return <div className="space-y-6"><h1 className="text-2xl font-bold">Espacio no encontrado</h1></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: space.color }} />
            <h1 className="text-2xl font-bold">{space.name}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground ml-7">
            {space.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {space.location}
              </span>
            )}
            {space.capacity && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {space.capacity} personas
              </span>
            )}
          </div>
          {space.description && (
            <p className="text-sm text-muted-foreground mt-2 ml-7">{space.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to={`/reservas/nueva?spaceId=${space.id}`}>
            <Button size="sm">
              <CalendarCheck className="mr-1.5 h-4 w-4" />
              Reservar
            </Button>
          </Link>
          {isAdmin && (
            <Link to={`/espacios/${space.id}/editar`}>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Upcoming bookings */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Próximas reservas</h2>
        {!space.bookings || space.bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No hay reservas próximas</p>
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {space.bookings.map((booking: any) => (
              <div key={booking.id} className="px-4 py-3">
                <h3 className="text-sm font-medium">{booking.title}</h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDateTime(booking.startDate)} — {formatDateTime(booking.endDate)}
                  </span>
                  <span>{booking.bookedByName}</span>
                </div>
                {booking.notes && (
                  <p className="text-xs text-muted-foreground mt-1">{booking.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
