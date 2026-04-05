import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useActivity, useCreateActivity, useUpdateActivity, useMembers, useSpaces } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, MapPin } from "lucide-react";

export function ReunionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing, isLoading } = useActivity(id || "");
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const { data: spacesData } = useSpaces({ active: "1" });
  const members = membersData?.members || [];
  const spaces = spacesData?.spaces || [];

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [synced, setSynced] = useState(false);

  if (isEdit && existing && !synced) {
    setTitle(existing.title || "");
    setStartDate(existing.startDate ? existing.startDate.slice(0, 16) : "");
    setLocation(existing.location || "");
    setDescription(existing.description || "");
    if (existing.attendees?.length) {
      setSelectedAttendees(existing.attendees.map((a: any) => a.id));
    }
    setSynced(true);
  }

  if (isEdit && isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  function toggleAttendee(memberId: string) {
    setSelectedAttendees(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId],
    );
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }

    const data: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: "MEETING",
      status: "PENDING",
      startDate: startDate || undefined,
      location: location.trim() || undefined,
      attendeeIds: selectedAttendees,
    };

    try {
      if (isEdit) {
        await updateActivity.mutateAsync(data);
        toast.success("Reunión actualizada");
        navigate(`/reuniones/${id}`);
      } else {
        const res: any = await createActivity.mutateAsync(data);
        toast.success("Reunión creada");
        navigate(`/reuniones/${res.id}`);
      }
    } catch {
      toast.error("Error al guardar");
    }
  }

  const isPending = createActivity.isPending || updateActivity.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar reunión" : "Nueva reunión"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Modifica los datos de la reunión" : "Convoca una nueva reunión"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear reunión"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos de la reunión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Junta directiva - Abril" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha y hora</Label>
                  <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Lugar / Enlace</Label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sala de reuniones o enlace Meet" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Orden del día</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Puntos a tratar en la reunión..." rows={5} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Convocados</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {/* Selected attendees */}
              {selectedAttendees.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedAttendees.map(id => {
                    const member = members.find((m: any) => m.id === id);
                    if (!member) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1">
                        {member.name}
                        <button type="button" onClick={() => toggleAttendee(id)} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Available members */}
              <div className="max-h-60 overflow-y-auto space-y-1">
                {members
                  .filter((m: any) => !selectedAttendees.includes(m.id))
                  .map((m: any) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAttendee(m.id)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                    >
                      {m.name}
                    </button>
                  ))}
              </div>

              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">No hay miembros disponibles</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
