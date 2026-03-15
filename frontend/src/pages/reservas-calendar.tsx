import { useState, useMemo } from "react";
import { Link } from "react-router";
import {
  Plus, ChevronLeft, ChevronRight, CalendarCheck, Trash2,
} from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths,
} from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useBookingsForCalendar, useSpaces, useDeleteBooking } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function ReservasCalendarPage() {
  const { isAdmin, user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteBooking = useDeleteBooking();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const from = format(calStart, "yyyy-MM-dd");
  const to = format(calEnd, "yyyy-MM-dd");

  const { data: bookingsData } = useBookingsForCalendar(from, to);
  const { data: spacesData } = useSpaces({ active: "1" });
  const bookings = bookingsData?.bookings || [];
  const spaces = spacesData?.spaces || [];

  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const today = new Date();

  const bookingsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const b of bookings) {
      const day = format(new Date(b.startDate), "yyyy-MM-dd");
      if (!map[day]) map[day] = [];
      map[day].push(b);
    }
    return map;
  }, [bookings]);

  function handleDelete() {
    if (!selectedBooking) return;
    deleteBooking.mutate(selectedBooking.id, {
      onSuccess: () => {
        toast.success("Reserva eliminada");
        setSelectedBooking(null);
        setShowDeleteConfirm(false);
      },
      onError: () => toast.error("Error al eliminar"),
    });
  }

  const canDelete = selectedBooking && (
    selectedBooking.bookedBy === user?.id || isAdmin
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reservas</h1>
          <p className="text-sm text-muted-foreground">
            Calendario de ocupación de espacios
          </p>
        </div>
        <Link to="/reservas/nueva">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Reservar
          </Button>
        </Link>
      </div>

      {/* Legend */}
      {spaces.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {spaces.map((s: any) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      )}

      {/* Calendar nav */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold capitalize min-w-[180px] text-center">
            {format(currentMonth, "MMMM yyyy", { locale: es })}
          </h2>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
          Hoy
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayBookings = bookingsByDay[key] || [];
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div
                key={key}
                className={`min-h-[90px] border-b border-r p-1 ${
                  !isCurrentMonth ? "bg-muted/30" : ""
                }`}
              >
                <div className={`text-xs font-medium mb-0.5 px-1 ${
                  isToday
                    ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center"
                    : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"
                }`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {dayBookings.slice(0, 3).map((b: any) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="w-full text-left text-[11px] leading-tight px-1.5 py-0.5 rounded truncate text-white hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: b.spaceColor || "#3b82f6" }}
                    >
                      {b.title}
                    </button>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-[10px] text-muted-foreground px-1">
                      +{dayBookings.length - 3} más
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking detail dialog */}
      <Dialog open={!!selectedBooking && !showDeleteConfirm} onOpenChange={(v) => !v && setSelectedBooking(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{selectedBooking?.title}</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selectedBooking.spaceColor }} />
                <span className="font-medium">{selectedBooking.spaceName}</span>
              </div>
              <p className="text-muted-foreground">
                {format(new Date(selectedBooking.startDate), "d MMM yyyy HH:mm", { locale: es })}
                {" — "}
                {format(new Date(selectedBooking.endDate), "HH:mm", { locale: es })}
              </p>
              <p className="text-muted-foreground">Reservado por {selectedBooking.bookedByName}</p>
              {selectedBooking.notes && (
                <p className="text-muted-foreground">{selectedBooking.notes}</p>
              )}
            </div>
          )}
          <DialogFooter>
            {canDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Eliminar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setSelectedBooking(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar reserva</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar la reserva "{selectedBooking?.title}"?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteBooking.isPending}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
