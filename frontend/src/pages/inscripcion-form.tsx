import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { MapPin, Upload, FileText, X } from "lucide-react";
import { useActivity, useCreateActivity, useUpdateActivity, useSpaces, useUploadDocument, useAttachDocument, useDetachDocument } from "@/api/hooks";
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
  const uploadDocument = useUploadDocument();
  const attachDocument = useAttachDocument(id || "");
  const { data: spacesData } = useSpaces({ active: "1" });
  const spaces = spacesData?.spaces || [];

  const [loading, setLoading] = useState(false);
  const [programDoc, setProgramDoc] = useState<{ id: string; title: string; fileName: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [programText, setProgramText] = useState("");
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
    if (activity.documents?.length) {
      const d = activity.documents[0];
      setProgramDoc({ id: d.id, title: d.title, fileName: d.fileName });
    }
    setProgramText(activity.programText || "");
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
      documentIds: programDoc ? [programDoc.id] : undefined,
      programText: !programDoc ? programText.trim() || undefined : undefined,
    };
    if (selectedSpaceId) {
      data.spaceId = selectedSpaceId;
    }

    try {
      if (isEdit) {
        await updateActivity.mutateAsync(data);
        toast.success("Curso actualizado");
      } else {
        await createActivity.mutateAsync(data);
        toast.success("Curso creado");
      }
      navigate("/inscripciones");
    } catch {
      toast.error("Error al guardar");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar curso" : "Nuevo curso"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? "Modifica los datos del curso" : "Crea un curso o taller con inscripcion publica"}
          </p>
        </div>
      </div>

      {/* Content — grid layout on desktop, stack on mobile */}
      <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-visible">
        <div className="grid gap-4 lg:grid-cols-3">

          {/* Column 1: Datos generales */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Datos del curso</h3>
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
                  placeholder="Descripcion del curso..."
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha y hora</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2 relative" ref={locationRef}>
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
            </CardContent>
          </Card>

          {/* Column 2: Inscripcion + Publicacion */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Inscripcion</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Modo</Label>
                  <select
                    value={enrollmentMode}
                    onChange={(e) => setEnrollmentMode(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="FIFO">Orden de llegada</option>
                    <option value="LOTTERY">Sorteo</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plazas</Label>
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
                    placeholder="20"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Precio</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={enrollmentPrice}
                    onChange={(e) => setEnrollmentPrice(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha limite</Label>
                  <Input
                    type="datetime-local"
                    value={enrollmentDeadline}
                    onChange={(e) => setEnrollmentDeadline(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t pt-3 mt-1">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Publicacion</h3>
                <div className="space-y-2">
                  <Label className="text-xs">Estado</Label>
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
                  <div className="space-y-1.5 mt-2">
                    <Label className="text-xs">Publicar automaticamente el</Label>
                    <Input
                      type="datetime-local"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">Vacio = publicar manualmente</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Column 3: Programa */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Programa</h3>

              {!programDoc && (
                <div className="space-y-2">
                  <textarea
                    value={programText}
                    onChange={(e) => setProgramText(e.target.value)}
                    placeholder="Describe el programa: sesiones, contenido, horarios..."
                    className="flex min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              )}

              {programDoc ? (
                <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-muted/30">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{programDoc.title}</p>
                      <p className="text-xs text-muted-foreground">{programDoc.fileName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProgramDoc(null)}
                    className="text-muted-foreground hover:text-destructive shrink-0 ml-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {uploading ? "Subiendo..." : "Subir PDF/Word"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground mt-1.5">El texto se extraera automaticamente</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        fd.append("title", title.trim() ? `Programa: ${title.trim()}` : `Programa: ${file.name}`);
                        fd.append("visibility", "GENERAL");
                        const doc: any = await uploadDocument.mutateAsync(fd);
                        setProgramDoc({ id: doc.id, title: doc.title, fileName: doc.fileName });
                        toast.success("Programa subido");
                      } catch {
                        toast.error("Error al subir");
                      }
                      setUploading(false);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-background border-t mt-4 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 py-3 flex items-center gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear curso"}
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/inscripciones")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
