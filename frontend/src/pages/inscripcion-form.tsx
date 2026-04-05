import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  MapPin, Upload, X, Plus, Check, ChevronDown,
  ImageIcon, CalendarDays, Clock, Euro, Users, Monitor, Eye,
} from "lucide-react";
import {
  useActivity, useCreateActivity, useUpdateActivity, useSpaces,
  useMembers, useContacts, useUploadDocument,
} from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

const CATEGORIES = ["Cocina", "Cultura", "Deporte", "Idiomas", "Informatica", "Manualidades", "Musica", "Salud", "Otro"];

interface Session {
  sessionDate: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  content: string;
}

// ─── Accordion Step Shell ────────────────────────────────────────────

function AccordionStep({
  number,
  title,
  subtitle,
  isOpen,
  isCompleted,
  onToggle,
  summaryTags,
  children,
  footer,
}: {
  number: number;
  title: string;
  subtitle: string;
  isOpen: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  summaryTags?: string[];
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="border-x border-t last:border-b first:rounded-t-xl last:rounded-b-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-start gap-3 px-5 py-4 text-left transition-colors",
          isOpen ? "bg-muted/40" : "bg-background hover:bg-muted/20",
        )}
      >
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
            isCompleted
              ? "bg-emerald-500 text-white"
              : isOpen
                ? "bg-primary text-primary-foreground"
                : "border-2 border-muted-foreground/20 text-muted-foreground",
          )}
        >
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-sm font-semibold", isOpen ? "text-primary" : "text-foreground")}>
            {title}
          </span>
          {!isOpen && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
          {!isOpen && isCompleted && summaryTags && summaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {summaryTags.map((tag, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="px-5 pb-5 pt-1 ml-10 space-y-4">
          {children}
          {footer}
        </div>
      )}
    </div>
  );
}

// ─── Step Navigation Buttons ─────────────────────────────────────────

function StepFooter({
  onContinue,
  canContinue = true,
}: {
  onContinue: () => void;
  canContinue?: boolean;
}) {
  return (
    <div className="flex justify-end pt-2">
      <Button size="sm" disabled={!canContinue} onClick={onContinue}>
        Continuar
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function InscripcionFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const { data: activity, isLoading: loadingActivity } = useActivity(id || "");
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");
  const uploadDocument = useUploadDocument();
  const { data: spacesData } = useSpaces({ active: "1" });
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const { data: contactsData } = useContacts({ limit: "200" });

  const spaces = spacesData?.spaces || [];
  const members = membersData?.members || [];
  const contacts = contactsData?.contacts || [];

  // Accordion state
  const [openStep, setOpenStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Form state
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [modality, setModality] = useState("presencial");
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [maxCapacity, setMaxCapacity] = useState("20");
  const [enrollmentPrice, setEnrollmentPrice] = useState("0");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [enrollmentMode, setEnrollmentMode] = useState("FIFO");
  const [courseType, setCourseType] = useState("CURSO");
  const [publishDate, setPublishDate] = useState("");
  const [programText, setProgramText] = useState("");
  const [programDoc, setProgramDoc] = useState<{ id: string; title: string; fileName: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [instructor, setInstructor] = useState<{ type: string; id: string; name: string } | null>(null);
  const [showInstructorDialog, setShowInstructorDialog] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([{ sessionDate: "", timeStart: "18:00", timeEnd: "21:00", title: "", content: "" }]);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const locationRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setShowLocationSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSpaces = spaces.filter((s: any) => s.name.toLowerCase().includes(location.toLowerCase()));

  // Sync state in edit mode
  if (isEdit && activity && !synced) {
    setTitle(activity.title || "");
    setDescription(activity.description || "");
    setStartDate(activity.startDate ? activity.startDate.slice(0, 16) : "");
    setLocation(activity.location || "");
    setMaxCapacity(activity.maxCapacity ? String(activity.maxCapacity) : "20");
    setEnrollmentPrice(activity.enrollmentPrice ? String(activity.enrollmentPrice) : "0");
    setEnrollmentDeadline(activity.enrollmentDeadline ? activity.enrollmentDeadline.slice(0, 16) : "");
    setEnrollmentMode(activity.enrollmentMode || "FIFO");
    setCourseType(activity.type || "EVENT");
    setPublishDate(activity.publishDate ? activity.publishDate.slice(0, 16) : "");
    setProgramText(activity.programText || "");
    if (activity.documents?.length) setProgramDoc({ id: activity.documents[0].id, title: activity.documents[0].title, fileName: activity.documents[0].fileName });
    if (activity.instructor) setInstructor(activity.instructor);
    if (activity.sessions?.length) setSessions(activity.sessions.map((s: any) => ({
      sessionDate: s.sessionDate ? s.sessionDate.slice(0, 10) : "", timeStart: s.timeStart || "", timeEnd: s.timeEnd || "", title: s.title || "", content: s.content || "",
    })));
    if (activity.coverImagePath) setCoverPreview(`${API_BASE}/activities/${id}/cover?v=${Date.now()}`);
    setCompleted(new Set([1, 2, 3, 4, 5]));
    setOpenStep(6);
    setSynced(true);
  }

  if (isEdit && loadingActivity) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  function updateSession(idx: number, field: keyof Session, value: string) {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(asDraft?: boolean) {
    if (!asDraft && !canPublish) {
      toast.error(`Faltan campos obligatorios: ${missingFields.join(", ")}`);
      return;
    }
    if (!title.trim()) { toast.error("El titulo es obligatorio"); return; }
    setLoading(true);
    const statusValue = asDraft ? "DRAFT" : "PUBLISHED";

    const data: Record<string, any> = {
      title: title.trim(), description: description.trim() || undefined, type: courseType, status: statusValue,
      startDate: startDate || sessions[0]?.sessionDate || undefined,
      location: location.trim() || undefined, enrollmentEnabled: true, enrollmentMode,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      enrollmentPrice: enrollmentPrice ? parseFloat(enrollmentPrice) : 0,
      enrollmentDeadline: enrollmentDeadline || undefined,
      publishStatus: statusValue, publishDate: publishDate || undefined,
      programText: !programDoc ? programText.trim() || undefined : undefined,
      documentIds: programDoc ? [programDoc.id] : undefined,
      instructorType: instructor?.type || undefined, instructorId: instructor?.id || undefined,
      sessions: sessions.filter(s => s.title || s.sessionDate),
    };
    if (selectedSpaceId) data.spaceId = selectedSpaceId;

    try {
      let actId = id;
      if (isEdit) { await updateActivity.mutateAsync(data); toast.success("Curso actualizado"); }
      else {
        const res: any = await createActivity.mutateAsync(data);
        actId = res.id;
        toast.success(statusValue === "PUBLISHED" ? "Curso publicado" : "Borrador guardado");
        const pendingFile = (coverInputRef.current as any)?.__pendingFile;
        if (pendingFile && actId) { const fd = new FormData(); fd.append("file", pendingFile); await api.upload(`/activities/${actId}/cover`, fd); }
      }
      navigate("/actividades?inscripciones=1");
    } catch { toast.error("Error al guardar"); }
    setLoading(false);
  }

  function markComplete(step: number) {
    setCompleted(prev => new Set([...prev, step]));
    setOpenStep(step + 1);
  }

  function toggleStep(step: number) {
    setOpenStep(openStep === step ? 0 : step);
  }

  // Summary helpers
  const sessionCount = sessions.filter(s => s.title || s.sessionDate).length;
  const isFree = !enrollmentPrice || parseFloat(enrollmentPrice) === 0;

  // Validation: what's missing for publishing
  const missingFields: string[] = [];
  if (!title.trim()) missingFields.push("Título");
  if (!category) missingFields.push("Categoría");
  if (sessionCount === 0) missingFields.push("Al menos 1 sesión");
  if (!maxCapacity || parseInt(maxCapacity) <= 0) missingFields.push("Plazas");
  const canPublish = missingFields.length === 0;

  function getSummary(step: number): string[] {
    switch (step) {
      case 1: return [title, description ? `${description.substring(0, 40)}...` : ""].filter(Boolean);
      case 2: return [category, modality === "presencial" ? "Presencial" : "Online", instructor?.name].filter(Boolean) as string[];
      case 3: return [isFree ? "Gratis" : `${enrollmentPrice}€`, `${maxCapacity} plazas`, enrollmentDeadline ? `Hasta ${new Date(enrollmentDeadline).toLocaleDateString("es-ES")}` : ""].filter(Boolean);
      case 4: return [programText ? `${programText.substring(0, 50)}...` : "", programDoc?.fileName].filter(Boolean) as string[];
      case 5: return sessions.filter(s => s.sessionDate).map(s => `${new Date(s.sessionDate + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })} ${s.timeStart}-${s.timeEnd}`);
      default: return [];
    }
  }

  // Preview progress
  const previewProgress = (() => {
    let items = 0, total = 7;
    if (title) items++;
    if (description) items++;
    if (category) items++;
    if (instructor) items++;
    if (maxCapacity) items++;
    if (programText || programDoc) items++;
    if (sessions.some(s => s.sessionDate)) items++;
    return Math.round((items / total) * 100);
  })();

  const previewDate = startDate
    ? new Date(startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })
    : sessions[0]?.sessionDate
      ? new Date(sessions[0].sessionDate + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })
      : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar curso" : "Nuevo curso"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Completa los pasos para publicar tu curso
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/actividades?inscripciones=1")}>
            Cancelar
          </Button>
          <Button variant="outline" size="sm" disabled={loading} onClick={() => handleSubmit(true)}>
            Guardar borrador
          </Button>
          <Button size="sm" disabled={loading || !canPublish} onClick={() => handleSubmit(false)}>
            <Eye className="h-3.5 w-3.5 mr-1.5" />Publicar curso
          </Button>
        </div>
      </div>

      {/* AI auto-fill banner */}
      <div className="flex items-center gap-4 rounded-xl border border-dashed p-4 bg-muted/30">
        <span className="text-xl">🪄</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold">Auto-rellenar con IA</span>
          <span className="text-sm text-muted-foreground ml-2">
            Sube un PDF o Word y completamos todo automáticamente
          </span>
        </div>
        {programDoc ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <Check className="h-3 w-3 mr-1" />{programDoc.fileName}
            </Badge>
            <button type="button" onClick={() => setProgramDoc(null)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <Button size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            {uploading ? "Analizando..." : "Subir documento"}
          </Button>
        )}
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploading(true);
            try {
              const analyzeFd = new FormData();
              analyzeFd.append("file", file);
              const analysis: any = await api.upload("/enrollments/analyze-document", analyzeFd);
              if (analysis.ok && analysis.extracted) {
                const ex = analysis.extracted;
                if (ex.titulo && !title) setTitle(ex.titulo);
                if (ex.descripcion && !description) setDescription(ex.descripcion);
                if (ex.categoria && !category) setCategory(ex.categoria);
                if (ex.precio !== null && ex.precio !== undefined && (!enrollmentPrice || enrollmentPrice === "0")) setEnrollmentPrice(String(ex.precio));
                if (ex.lugar && !location) setLocation(ex.lugar);
                if (ex.sesiones?.length) {
                  setSessions(ex.sesiones.map((s: any) => ({
                    sessionDate: s.sessionDate || "", timeStart: s.timeStart || "18:00", timeEnd: s.timeEnd || "21:00", title: s.title || "", content: s.content || "",
                  })));
                }
                toast.success("Campos rellenados automáticamente");
              }
              const docFd = new FormData();
              docFd.append("file", file);
              docFd.append("title", title.trim() ? `Programa: ${title.trim()}` : `Programa: ${file.name}`);
              docFd.append("visibility", "GENERAL");
              const doc: any = await uploadDocument.mutateAsync(docFd);
              setProgramDoc({ id: doc.id, title: doc.title, fileName: doc.fileName });
            } catch (err: any) {
              toast.error(err?.message || "Error al analizar el documento");
            }
            setUploading(false);
            e.target.value = "";
          }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ═══ LEFT: Accordion ═══ */}
        <div>
          {/* Step 1: Datos básicos */}
          <AccordionStep
            number={1} title="Datos básicos" subtitle="Título, descripción y portada"
            isOpen={openStep === 1} isCompleted={completed.has(1)}
            onToggle={() => toggleStep(1)}
            summaryTags={getSummary(1)}
            footer={<StepFooter onContinue={() => markComplete(1)} canContinue={title.trim().length > 0} />}
          >
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {[{ v: "CURSO", l: "Curso" }, { v: "TALLER", l: "Taller" }].map(t => (
                  <button key={t.v} type="button" onClick={() => setCourseType(t.v)}
                    className={cn("flex-1 h-10 rounded-lg border transition-colors text-sm font-medium",
                      courseType === t.v ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary/30")}>
                    {t.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Curso de cocina vasca" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el curso: qué aprenderán, a quién va dirigido..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              <div
                className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-colors bg-muted/20 overflow-hidden relative"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-medium">Cambiar imagen</span>
                    </div>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    <span className="text-sm text-muted-foreground">Arrastra o haz clic para subir</span>
                  </>
                )}
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverPreview(URL.createObjectURL(f)); (coverInputRef.current as any).__pendingFile = f; } e.target.value = ""; }} />
              </div>
            </div>
          </AccordionStep>

          {/* Step 2: Categoría y formato */}
          <AccordionStep
            number={2} title="Categoría y formato" subtitle="Tipo, modalidad e instructor"
            isOpen={openStep === 2} isCompleted={completed.has(2)}
            onToggle={() => toggleStep(2)}
            summaryTags={getSummary(2)}
            footer={<StepFooter onContinue={() => markComplete(2)} />}
          >
            <div className="space-y-2">
              <Label>Categoría</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(category === c ? "" : c)}
                    className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                      category === c ? "border-primary bg-primary/5 text-primary" : "border-muted-foreground/20 text-muted-foreground hover:border-primary/40")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Modalidad</Label>
              <div className="flex gap-2">
                {[{ v: "presencial", icon: MapPin, l: "Presencial" }, { v: "online", icon: Monitor, l: "Online" }].map(m => (
                  <button key={m.v} type="button" onClick={() => setModality(m.v)}
                    className={cn("flex-1 flex items-center justify-center gap-2 h-10 rounded-lg border transition-colors text-sm font-medium",
                      modality === m.v ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary/30")}>
                    <m.icon className="h-4 w-4" />{m.l}
                  </button>
                ))}
              </div>
            </div>
            {modality === "presencial" && (
              <div className="space-y-2 relative" ref={locationRef}>
                <Label>Lugar</Label>
                <Input value={location}
                  onChange={(e) => { setLocation(e.target.value); setSelectedSpaceId(""); setShowLocationSuggestions(true); }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  placeholder="Selecciona espacio..." />
                {showLocationSuggestions && filteredSpaces.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
                    {filteredSpaces.map((s: any) => (
                      <button key={s.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => { setLocation(s.name); setSelectedSpaceId(s.id); setShowLocationSuggestions(false); if (s.capacity) setMaxCapacity(String(s.capacity)); }}>
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span>{s.name}</span>
                        {s.capacity && <span className="text-xs text-muted-foreground ml-auto">{s.capacity}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {modality === "online" && (
              <div className="space-y-2">
                <Label>Enlace</Label>
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="https://meet.google.com/..." />
              </div>
            )}
            <div className="space-y-2">
              <Label>Instructor</Label>
              {instructor ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-lg border bg-muted/30">
                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0", instructor.type === "MEMBER" ? "bg-blue-500" : "bg-orange-500")}>
                    {instructor.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium truncate">{instructor.name}</span>
                  <button type="button" onClick={() => setInstructor(null)} className="ml-auto text-muted-foreground hover:text-destructive shrink-0"><X className="h-3.5 w-3.5" /></button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full h-10" onClick={() => setShowInstructorDialog(true)}>
                  <Plus className="h-4 w-4 mr-1.5" />Seleccionar instructor
                </Button>
              )}
            </div>
          </AccordionStep>

          {/* Step 3: Inscripción y precio */}
          <AccordionStep
            number={3} title="Inscripción y precio" subtitle="Plazas, coste y fecha límite"
            isOpen={openStep === 3} isCompleted={completed.has(3)}
            onToggle={() => toggleStep(3)}
            summaryTags={getSummary(3)}
            footer={<StepFooter onContinue={() => markComplete(3)} />}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modo de inscripción</Label>
                <select value={enrollmentMode} onChange={(e) => setEnrollmentMode(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option value="FIFO">Por orden de inscripción</option>
                  <option value="LOTTERY">Sorteo</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Plazas</Label>
                <Input type="number" min="1" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} placeholder="20" />
                {(() => {
                  const selectedSpace = spaces.find((s: any) => s.id === selectedSpaceId);
                  if (selectedSpace?.capacity && parseInt(maxCapacity) > selectedSpace.capacity) {
                    return <p className="text-[11px] text-amber-600">{selectedSpace.name} tiene un aforo de {selectedSpace.capacity}</p>;
                  }
                  return null;
                })()}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Precio</Label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setEnrollmentPrice(isFree ? "" : "0")}
                    className={cn("px-3 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap",
                      isFree ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-input text-muted-foreground hover:border-primary/30")}>
                    Gratis
                  </button>
                  {!isFree && (
                    <div className="relative flex-1">
                      <Input type="number" min="0" step="0.01" value={enrollmentPrice} onChange={(e) => setEnrollmentPrice(e.target.value)} placeholder="0" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">€</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fecha límite</Label>
                <Input type="datetime-local" value={enrollmentDeadline} onChange={(e) => setEnrollmentDeadline(e.target.value)} />
              </div>
            </div>
            {enrollmentMode === "LOTTERY" && (
              <div className="rounded-lg p-3 bg-amber-50 border border-amber-200/50 text-sm text-amber-700">
                Las inscripciones se recopilan hasta la fecha límite y luego se asignan por sorteo.
              </div>
            )}
          </AccordionStep>

          {/* Step 4: Programa */}
          <AccordionStep
            number={4} title="Programa" subtitle="Contenidos y materiales"
            isOpen={openStep === 4} isCompleted={completed.has(4)}
            onToggle={() => toggleStep(4)}
            summaryTags={getSummary(4)}
            footer={<StepFooter onContinue={() => markComplete(4)} />}
          >
            <div className="space-y-2">
              <Label>Programa / temario</Label>
              <textarea value={programText} onChange={(e) => setProgramText(e.target.value)}
                placeholder="Describe los contenidos del curso, objetivos de aprendizaje..."
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            {programDoc && (
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-emerald-50 border-emerald-200">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium text-emerald-700 truncate">{programDoc.fileName}</span>
                <button type="button" onClick={() => setProgramDoc(null)} className="ml-auto text-muted-foreground hover:text-destructive shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </AccordionStep>

          {/* Step 5: Sesiones */}
          <AccordionStep
            number={5} title="Sesiones" subtitle="Fechas y horarios"
            isOpen={openStep === 5} isCompleted={completed.has(5)}
            onToggle={() => toggleStep(5)}
            summaryTags={getSummary(5)}
            footer={<StepFooter onContinue={() => markComplete(5)} />}
          >
            <SessionScheduler sessions={sessions} setSessions={setSessions} updateSession={updateSession} />
          </AccordionStep>

          {/* Step 6: Resumen */}
          <AccordionStep
            number={6} title="Resumen" subtitle="Revisar y publicar"
            isOpen={openStep === 6} isCompleted={false}
            onToggle={() => toggleStep(6)}
            footer={
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" disabled={loading} onClick={() => handleSubmit(true)}>
                  Guardar borrador
                </Button>
                <Button size="sm" disabled={loading || !canPublish} onClick={() => handleSubmit(false)}>
                  Publicar curso
                </Button>
              </div>
            }
          >
            <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
              <div>
                <h3 className="text-lg font-bold">{title || "Sin título"}</h3>
                {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { l: "Categoría", v: category || "—" },
                  { l: "Modalidad", v: modality === "presencial" ? `Presencial${location ? ` — ${location}` : ""}` : "Online" },
                  { l: "Instructor", v: instructor?.name || "—" },
                  { l: "Plazas", v: maxCapacity || "—" },
                  { l: "Precio", v: isFree ? "Gratis" : `${enrollmentPrice}€` },
                  { l: "Sesiones", v: sessionCount ? `${sessionCount} sesión(es)` : "—" },
                ].map((d, i) => (
                  <div key={i} className="py-2 border-b">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{d.l}</p>
                    <p className="text-sm font-medium mt-0.5">{d.v}</p>
                  </div>
                ))}
              </div>
              {sessionCount > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Calendario</p>
                  {sessions.filter(s => s.sessionDate).map((s, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span>{new Date(s.sessionDate + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="text-muted-foreground">{s.timeStart} – {s.timeEnd}</span>
                    </div>
                  ))}
                </div>
              )}
              {canPublish ? (
                <div className="rounded-lg p-3 bg-emerald-50 border border-emerald-200/50 text-sm text-emerald-700">
                  Todo listo. Puedes publicar el curso o guardarlo como borrador.
                </div>
              ) : (
                <div className="rounded-lg p-3 bg-amber-50 border border-amber-200/50 text-sm text-amber-700">
                  <p className="font-medium">Faltan campos obligatorios:</p>
                  <ul className="list-disc list-inside mt-1">
                    {missingFields.map((f, i) => <li key={i}>{f}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </AccordionStep>
        </div>

        {/* ═══ RIGHT: Preview Sidebar (desktop only) ═══ */}
        <aside className="hidden lg:block sticky top-[80px] self-start space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground">Completado</span>
              <span className="text-xs font-semibold text-primary">{previewProgress}%</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", previewProgress === 100 ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${previewProgress}%` }}
              />
            </div>
          </div>

          {/* Preview card */}
          <div className="rounded-xl border overflow-hidden">
            <div
              className={cn("h-24 relative", coverPreview ? "" : "bg-gradient-to-br from-primary/80 to-primary/60")}
              style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
            >
              {!coverPreview && <span className="absolute inset-0 flex items-center justify-center text-white/40 text-xs">Sin imagen</span>}
            </div>
            <div className="p-4 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{user?.tenantName || "Asociación"}</p>
              <p className="text-sm font-bold leading-tight">{title || "Título del curso"}</p>
              {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {category && <Badge variant="secondary" className="text-[10px]">{category}</Badge>}
                {previewDate && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><CalendarDays className="h-2.5 w-2.5" />{previewDate}</span>}
                {location && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{location}</span>}
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Euro className="h-2.5 w-2.5" />{isFree ? "Gratis" : `${enrollmentPrice}€`}</span>
                {maxCapacity && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{maxCapacity} plazas</span>}
                {sessionCount > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{sessionCount} ses.</span>}
              </div>
            </div>
          </div>

          {/* Dynamic detail rows */}
          <div className="rounded-xl border divide-y">
            {instructor && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Instructor</p>
                <p className="text-sm font-medium mt-0.5">{instructor.name}</p>
              </div>
            )}
            {programText && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Programa</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{programText}</p>
              </div>
            )}
            {sessions.some(s => s.sessionDate) && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sesiones</p>
                {sessions.filter(s => s.sessionDate).slice(0, 4).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs py-0.5">
                    <span>{new Date(s.sessionDate + "T00:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</span>
                    <span className="text-muted-foreground">{s.timeStart}-{s.timeEnd}</span>
                  </div>
                ))}
                {sessions.filter(s => s.sessionDate).length > 4 && (
                  <p className="text-[10px] text-muted-foreground mt-1">+{sessions.filter(s => s.sessionDate).length - 4} más</p>
                )}
              </div>
            )}
            {enrollmentDeadline && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inscripción hasta</p>
                <p className="text-sm font-medium mt-0.5">
                  {new Date(enrollmentDeadline).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            )}
            {!instructor && !programText && !sessions.some(s => s.sessionDate) && !enrollmentDeadline && (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Completa los pasos para ver la vista previa</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Instructor Dialog */}
      <InstructorDialog open={showInstructorDialog} onClose={() => setShowInstructorDialog(false)} members={members} contacts={contacts}
        onSelect={(type, id, name) => { setInstructor({ type, id, name }); setShowInstructorDialog(false); }} />
    </div>
  );
}

// ─── Session Scheduler ───────────────────────────────────────────────

const WEEKDAYS = [
  { value: 1, label: "Lun" }, { value: 2, label: "Mar" }, { value: 3, label: "Mié" },
  { value: 4, label: "Jue" }, { value: 5, label: "Vie" }, { value: 6, label: "Sáb" }, { value: 0, label: "Dom" },
];

type Frequency = "once" | "weekly" | "monthly" | "custom";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "once", label: "Una vez" }, { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" }, { value: "custom", label: "Custom" },
];

function generateSessions(frequency: Frequency, selectedDays: number[], timeStart: string, timeEnd: string, dateFrom: string, dateTo: string, monthDay: number): Session[] {
  if (frequency === "once") return dateFrom ? [{ sessionDate: dateFrom, timeStart, timeEnd, title: "", content: "" }] : [];
  if (!dateFrom || !dateTo) return [];
  const from = new Date(dateFrom + "T00:00:00");
  const to = new Date(dateTo + "T00:00:00");
  if (to <= from) return [];
  const sessions: Session[] = [];
  if (frequency === "weekly") {
    if (!selectedDays.length) return [];
    const current = new Date(from);
    while (current <= to) {
      if (selectedDays.includes(current.getDay())) sessions.push({ sessionDate: current.toISOString().slice(0, 10), timeStart, timeEnd, title: "", content: "" });
      current.setDate(current.getDate() + 1);
    }
  }
  if (frequency === "monthly") {
    const current = new Date(from);
    current.setDate(monthDay);
    if (current < from) current.setMonth(current.getMonth() + 1);
    while (current <= to) {
      sessions.push({ sessionDate: current.toISOString().slice(0, 10), timeStart, timeEnd, title: "", content: "" });
      current.setMonth(current.getMonth() + 1);
    }
  }
  return sessions;
}

function SessionScheduler({ sessions, setSessions, updateSession }: {
  sessions: Session[]; setSessions: (s: Session[]) => void; updateSession: (idx: number, field: keyof Session, value: string) => void;
}) {
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [timeStart, setTimeStart] = useState("18:00");
  const [timeEnd, setTimeEnd] = useState("19:00");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [monthDay, setMonthDay] = useState(1);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (frequency === "custom") return;
    const generated = generateSessions(frequency, selectedDays, timeStart, timeEnd, dateFrom, dateTo, monthDay);
    const enriched = generated.map(g => {
      const existing = sessions.find(s => s.sessionDate === g.sessionDate);
      return existing ? { ...g, title: existing.title, content: existing.content } : g;
    });
    setSessions(enriched);
  }, [frequency, selectedDays, timeStart, timeEnd, dateFrom, dateTo, monthDay]);

  function toggleDay(day: number) { setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()); }
  function removeSession(idx: number) { setSessions(sessions.filter((_, i) => i !== idx)); }
  function addManualSession() {
    const last = sessions[sessions.length - 1];
    const ns: Session = { sessionDate: "", timeStart: last?.timeStart || timeStart || "18:00", timeEnd: last?.timeEnd || timeEnd || "19:00", title: "", content: "" };
    if (last?.sessionDate) { const d = new Date(last.sessionDate + "T00:00:00"); d.setDate(d.getDate() + 7); ns.sessionDate = d.toISOString().slice(0, 10); }
    setSessions([...sessions, ns]);
    setEditingIdx(sessions.length);
  }
  const formatSessionDate = (dateStr: string) => !dateStr ? "Sin fecha" : new Date(dateStr + "T00:00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">¿Cuándo se imparte este curso?</h3>

      <div className="flex items-center gap-1 rounded-lg border p-1 w-fit">
        {FREQUENCY_OPTIONS.map(f => (
          <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
            className={cn("px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
              frequency === f.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
            {f.label}
          </button>
        ))}
      </div>

      {frequency === "weekly" && (
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Días de la semana</Label>
          <div className="flex gap-1.5">
            {WEEKDAYS.map(d => (
              <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                className={cn("flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1.5",
                  selectedDays.includes(d.value) ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary/30")}>
                {selectedDays.includes(d.value) && <Check className="h-3 w-3" />}{d.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {frequency === "monthly" && (
        <div className="space-y-1.5 max-w-[200px]">
          <Label className="text-xs font-semibold">Día del mes</Label>
          <Input type="number" min={1} max={31} value={monthDay} onChange={(e) => setMonthDay(parseInt(e.target.value) || 1)} />
        </div>
      )}
      {frequency !== "custom" && (
        <div className={cn("grid gap-3", frequency === "once" ? "grid-cols-3" : "grid-cols-[1fr_1fr_1fr_1fr]")}>
          <div className="space-y-1.5"><Label className="text-xs font-semibold">Hora inicio</Label><Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label className="text-xs font-semibold">Hora fin</Label><Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} /></div>
          {frequency === "once" ? (
            <div className="space-y-1.5"><Label className="text-xs font-semibold">Fecha</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
          ) : (
            <>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Desde</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs font-semibold">Hasta</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
            </>
          )}
        </div>
      )}

      {/* Generated sessions list */}
      {(sessions.length > 0 || frequency === "custom") && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sesiones generadas</h4>
          {sessions.length > 0 ? (
            <div className="rounded-lg border divide-y">
              {sessions.map((s, i) => (
                <div key={i}>
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-sm font-medium w-28 shrink-0">{formatSessionDate(s.sessionDate)}</span>
                    <span className="text-sm text-muted-foreground">{s.timeStart} – {s.timeEnd}</span>
                    {s.title && <span className="text-sm text-muted-foreground truncate hidden sm:block">· {s.title}</span>}
                    <div className="ml-auto flex items-center gap-1 shrink-0">
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingIdx(editingIdx === i ? null : i)}>
                        {editingIdx === i ? "Cerrar" : "Editar"}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => { removeSession(i); if (editingIdx === i) setEditingIdx(null); }}>
                        Eliminar
                      </Button>
                    </div>
                  </div>
                  {editingIdx === i && (
                    <div className="px-3 pb-3 space-y-2 border-t bg-muted/30">
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="space-y-1"><Label className="text-xs">Fecha</Label><Input type="date" value={s.sessionDate} onChange={(e) => updateSession(i, "sessionDate", e.target.value)} /></div>
                        <div className="space-y-1"><Label className="text-xs">Inicio</Label><Input type="time" value={s.timeStart} onChange={(e) => updateSession(i, "timeStart", e.target.value)} /></div>
                        <div className="space-y-1"><Label className="text-xs">Fin</Label><Input type="time" value={s.timeEnd} onChange={(e) => updateSession(i, "timeEnd", e.target.value)} /></div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Título</Label><Input value={s.title} onChange={(e) => updateSession(i, "title", e.target.value)} placeholder="Ej: Bases y fondos de la cocina vasca" /></div>
                      <div className="space-y-1"><Label className="text-xs">Contenido</Label>
                        <textarea value={s.content} onChange={(e) => updateSession(i, "content", e.target.value)} placeholder="Describe brevemente qué se verá..."
                          className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {frequency === "custom" ? "Añade sesiones manualmente" : "Configura la frecuencia para generar sesiones"}
            </p>
          )}
          <div className="flex items-center justify-between">
            {sessions.length > 0 && <span className="text-sm text-muted-foreground">Total: <strong>{sessions.length} sesiones</strong></span>}
            <Button type="button" variant="outline" size="sm" onClick={addManualSession} className="ml-auto">
              <Plus className="h-3.5 w-3.5 mr-1.5" />Añadir sesión
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Instructor Dialog ───────────────────────────────────────────────

function InstructorDialog({ open, onClose, members, contacts, onSelect }: {
  open: boolean; onClose: () => void; members: any[]; contacts: any[];
  onSelect: (type: string, id: string, name: string) => void;
}) {
  const [tab, setTab] = useState<"members" | "contacts">("members");
  const [search, setSearch] = useState("");
  const filtered = tab === "members"
    ? members.filter((m: any) => m.name.toLowerCase().includes(search.toLowerCase()))
    : contacts.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Seleccionar instructor</DialogTitle></DialogHeader>
        <div className="flex gap-1 mb-3">
          {(["members", "contacts"] as const).map(t => (
            <button key={t} type="button" className={cn("text-sm px-3 py-1 rounded-md transition-colors", tab === t ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              onClick={() => { setTab(t); setSearch(""); }}>{t === "members" ? "Miembros" : "Contactos"}</button>
          ))}
        </div>
        <Input placeholder={tab === "members" ? "Buscar miembro..." : "Buscar contacto..."} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-60 overflow-y-auto space-y-1 mt-2">
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados</p> :
            filtered.map((item: any) => (
              <button key={item.id} type="button" className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                onClick={() => onSelect(tab === "members" ? "MEMBER" : "CONTACT", item.id, item.name)}>
                <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold", tab === "members" ? "bg-blue-500" : "bg-orange-500")}>
                  {item.name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.email && <p className="text-xs text-muted-foreground">{item.email}</p>}
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
