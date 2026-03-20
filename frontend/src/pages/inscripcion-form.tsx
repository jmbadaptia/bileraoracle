import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { useActivity, useCreateActivity, useUpdateActivity, useSpaces } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function InscripcionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: activity, isLoading: loadingActivity } = useActivity(id || "");
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");
  const { data: spacesData } = useSpaces({ active: "1" });
  const spaces = spacesData?.spaces || [];

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState("");
  const [enrollmentPrice, setEnrollmentPrice] = useState("");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [enrollmentMode, setEnrollmentMode] = useState("FIFO");
  const [publishStatus, setPublishStatus] = useState("DRAFT");
  const [publishDate, setPublishDate] = useState("");
  const [synced, setSynced] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  // Close location suggestions on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setShowLocationSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSpaces = spaces.filter((s: any) =>
    s.name.toLowerCase().includes(location.toLowerCase())
  );

  // Sync state when activity loads (edit mode)
  if (isEdit && activity && !synced) {
    setTitle(activity.title || "");
    setDescription(activity.description || "");
    setStartDate(activity.startDate ? activity.startDate.slice(0, 16) : "");
    setLocation(activity.location || "");
    setMaxCapacity(activity.maxCapacity ? String(activity.maxCapacity) : "");
    setEnrollmentPrice(activity.enrollmentPrice ? String(activity.enrollmentPrice) : "");
    setEnrollmentDeadline(activity.enrollmentDeadline ? activity.enrollmentDeadline.slice(0, 16) : "");
    setEnrollmentMode(activity.enrollmentMode || "FIFO");
    setPublishStatus(activity.publishStatus || "PUBLISHED");
    setPublishDate(activity.publishDate ? activity.publishDate.slice(0, 16) : "");
    setSynced(true);
  }

  if (isEdit && loadingActivity) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El titulo es obligatorio");
      return;
    }
    setLoading(true);

    const data: Record<string, any> = {
      title: title.trim(),
      description: description.trim() || undefined,
      type: "EVENT",
      status: "PENDING",
      startDate: startDate || undefined,
      location: location.trim() || undefined,
      enrollmentEnabled: true,
      enrollmentMode,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      enrollmentPrice: enrollmentPrice ? parseFloat(enrollmentPrice) : 0,
      enrollmentDeadline: enrollmentDeadline || undefined,
      publishStatus,
      publishDate: publishDate || undefined,
    };
    if (selectedSpaceId) {
      data.spaceId = selectedSpaceId;
    }

    try {
      if (isEdit) {
        await updateActivity.mutateAsync(data);
        toast.success("Inscripcion actualizada");
      } else {
        await createActivity.mutateAsync(data);
        toast.success("Inscripcion creada");
      }
      navigate("/inscripciones");
    } catch {
      toast.error("Error al guardar");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? "Editar inscripcion" : "Nueva inscripcion"}
        </h1>
        <p className="text-muted-foreground">
          {isEdit ? "Modifica los datos del curso o taller" : "Crea un curso o taller con inscripcion publica"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titulo *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Curso de cocina vasca"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripcion</Label>
                <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripcion del curso o taller..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha y hora</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 relative md:col-span-2" ref={locationRef}>
                <Label htmlFor="location">Lugar</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setSelectedSpaceId("");
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  placeholder="Escribe o selecciona un espacio..."
                />
                {showLocationSuggestions && filteredSpaces.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {filteredSpaces.map((s: any) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2 transition-colors"
                        onClick={() => {
                          setLocation(s.name);
                          setSelectedSpaceId(s.id);
                          setShowLocationSuggestions(false);
                          if (!maxCapacity && s.capacity) {
                            setMaxCapacity(String(s.capacity));
                          } else if (maxCapacity && s.capacity && parseInt(maxCapacity) > s.capacity) {
                            toast.warning(`El espacio "${s.name}" tiene capacidad para ${s.capacity} personas, pero has puesto ${maxCapacity} plazas.`);
                          }
                        }}
                      >
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{s.name}</span>
                        {s.capacity && (
                          <span className="text-xs text-muted-foreground ml-auto">{s.capacity} plazas</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="text-base font-semibold">Configuracion de inscripcion</h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Modo de asignacion</Label>
                <select
                  value={enrollmentMode}
                  onChange={(e) => setEnrollmentMode(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="FIFO">Orden de llegada</option>
                  <option value="LOTTERY">Sorteo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Plazas maximas</Label>
                <Input
                  type="number"
                  min="1"
                  value={maxCapacity}
                  onChange={(e) => {
                    setMaxCapacity(e.target.value);
                    const val = parseInt(e.target.value);
                    const space = spaces.find((s: any) => s.id === selectedSpaceId);
                    if (space?.capacity && val > space.capacity) {
                      toast.warning(`El espacio "${space.name}" tiene capacidad para ${space.capacity} personas.`);
                    }
                  }}
                  placeholder="Ej: 20"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio (0 = gratuita)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={enrollmentPrice}
                  onChange={(e) => setEnrollmentPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha limite inscripcion</Label>
                <Input
                  type="datetime-local"
                  value={enrollmentDeadline}
                  onChange={(e) => setEnrollmentDeadline(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="text-base font-semibold">Publicacion</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <select
                  value={publishStatus}
                  onChange={(e) => setPublishStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="DRAFT">Borrador</option>
                  <option value="PUBLISHED">Publicado</option>
                </select>
              </div>
              {publishStatus === "DRAFT" && (
                <div className="space-y-2">
                  <Label>Publicar automaticamente el</Label>
                  <Input
                    type="datetime-local"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    placeholder="Dejar vacio para publicar manualmente"
                  />
                  <p className="text-xs text-muted-foreground">Dejar vacio para publicar manualmente</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear inscripcion"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate("/inscripciones")}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
