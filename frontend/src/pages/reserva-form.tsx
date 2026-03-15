import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { CalendarCheck, X } from "lucide-react";
import { useSpaces, useActivities, useCreateBooking } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function oneHourLater() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  now.setHours(now.getHours() + 1);
  return now.toISOString().slice(0, 16);
}

export function ReservaFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedSpaceId = searchParams.get("spaceId") || "";

  const { data: spacesData } = useSpaces({ active: "1" });
  const { data: activitiesData } = useActivities({ limit: "100" });
  const createBooking = useCreateBooking();

  const spaces = spacesData?.spaces || [];
  const activities = activitiesData?.activities || [];

  const [spaceId, setSpaceId] = useState(preselectedSpaceId);
  const [activityId, setActivityId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const fd = new FormData(e.currentTarget);
    const data = {
      spaceId: spaceId,
      title: fd.get("title") as string,
      startDate: fd.get("startDate") as string,
      endDate: fd.get("endDate") as string,
      notes: (fd.get("notes") as string) || undefined,
      activityId: activityId || undefined,
    };

    try {
      await createBooking.mutateAsync(data);
      toast.success("Reserva creada");
      navigate("/reservas");
    } catch (err: any) {
      const msg = err?.error || err?.message || "Error al crear la reserva";
      if (msg.includes("horario")) {
        setError(msg);
      } else {
        toast.error(msg);
      }
    }
    setSaving(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva reserva</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-1.5">
          <Label>Espacio *</Label>
          <select
            value={spaceId}
            onChange={(e) => setSpaceId(e.target.value)}
            required
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
          >
            <option value="">Seleccionar espacio</option>
            {spaces.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}{s.location ? ` — ${s.location}` : ""}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Título *</Label>
          <Input name="title" required placeholder="Ej: Reunión de equipo" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Inicio *</Label>
            <Input name="startDate" type="datetime-local" required defaultValue={nowLocal()} />
          </div>
          <div className="space-y-1.5">
            <Label>Fin *</Label>
            <Input name="endDate" type="datetime-local" required defaultValue={oneHourLater()} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Notas</Label>
          <Input name="notes" placeholder="Notas adicionales (opcional)" />
        </div>

        <div className="space-y-1.5">
          <Label>Vincular a actividad (opcional)</Label>
          <select
            value={activityId}
            onChange={(e) => setActivityId(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
          >
            <option value="">Sin vincular</option>
            {activities.map((a: any) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando..." : "Crear reserva"}
          </Button>
        </div>
      </form>
    </div>
  );
}
