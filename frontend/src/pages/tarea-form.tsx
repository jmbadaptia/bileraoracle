import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useActivity, useCreateActivity, useUpdateActivity, useMembers } from "@/api/hooks";
import { PRIORITY_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TareaFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing, isLoading } = useActivity(id || "");
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const members = membersData?.members || [];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState("PENDING");
  const [synced, setSynced] = useState(false);

  if (isEdit && existing && !synced) {
    setTitle(existing.title || "");
    setDescription(existing.description || "");
    setOwnerId(existing.ownerId || "");
    setStartDate(existing.startDate ? existing.startDate.slice(0, 16) : "");
    setPriority(existing.priority || "MEDIUM");
    setStatus(existing.status || "PENDING");
    setSynced(true);
  }

  if (isEdit && isLoading) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  async function handleSubmit() {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }

    const data: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: "TASK",
      status,
      priority,
      startDate: startDate || undefined,
      ownerId: ownerId || undefined,
    };

    try {
      if (isEdit) {
        await updateActivity.mutateAsync(data);
        toast.success("Tarea actualizada");
        navigate(`/tareas/${id}`);
      } else {
        const res: any = await createActivity.mutateAsync(data);
        toast.success("Tarea creada");
        navigate(`/tareas/${res.id}`);
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
            {isEdit ? "Editar tarea" : "Nueva tarea"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Modifica los datos de la tarea" : "Crea una nueva tarea de gestión interna"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos de la tarea</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles adicionales..." rows={4} />
            </div>
          </CardContent>
        </Card>

        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={ownerId || "_none"} onValueChange={(v) => setOwnerId(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin asignar</SelectItem>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACTIVITY_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
