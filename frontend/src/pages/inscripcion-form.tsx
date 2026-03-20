import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  MapPin, Upload, FileText, X, Plus, ChevronLeft, ChevronRight, Check,
  ImageIcon, CalendarDays, Clock, Euro, Users, Shuffle, Monitor, Eye,
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

const STEPS = [
  { label: "Datos del curso", desc: "Info e inscripcion", icon: "📋" },
  { label: "Sesiones", desc: "Fechas y contenidos", icon: "📅" },
  { label: "Resumen", desc: "Revisar y publicar", icon: "✅" },
];

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

  // Wizard step
  const [step, setStep] = useState(0);

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
  const [publishStatus, setPublishStatus] = useState("DRAFT");
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
    setPublishStatus(activity.publishStatus || "PUBLISHED");
    setPublishDate(activity.publishDate ? activity.publishDate.slice(0, 16) : "");
    setProgramText(activity.programText || "");
    if (activity.documents?.length) setProgramDoc({ id: activity.documents[0].id, title: activity.documents[0].title, fileName: activity.documents[0].fileName });
    if (activity.instructor) setInstructor(activity.instructor);
    if (activity.sessions?.length) setSessions(activity.sessions.map((s: any) => ({
      sessionDate: s.sessionDate ? s.sessionDate.slice(0, 10) : "", timeStart: s.timeStart || "", timeEnd: s.timeEnd || "", title: s.title || "", content: s.content || "",
    })));
    if (activity.coverImagePath) setCoverPreview(`${API_BASE}/activities/${id}/cover?v=${Date.now()}`);
    setSynced(true);
  }

  if (isEdit && loadingActivity) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  function addSession() {
    const last = sessions[sessions.length - 1];
    const ns: Session = { sessionDate: "", timeStart: last?.timeStart || "18:00", timeEnd: last?.timeEnd || "21:00", title: "", content: "" };
    if (last?.sessionDate) { const d = new Date(last.sessionDate); d.setDate(d.getDate() + 7); ns.sessionDate = d.toISOString().slice(0, 10); }
    setSessions([...sessions, ns]);
  }

  function updateSession(idx: number, field: keyof Session, value: string) {
    setSessions(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(asDraft?: boolean) {
    if (!title.trim()) { toast.error("El titulo es obligatorio"); return; }
    setLoading(true);
    const ps = asDraft ? "DRAFT" : "PUBLISHED";

    const data: Record<string, any> = {
      title: title.trim(), description: description.trim() || undefined, type: "EVENT", status: "PENDING",
      startDate: startDate || sessions[0]?.sessionDate || undefined,
      location: location.trim() || undefined, enrollmentEnabled: true, enrollmentMode,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : undefined,
      enrollmentPrice: enrollmentPrice ? parseFloat(enrollmentPrice) : 0,
      enrollmentDeadline: enrollmentDeadline || undefined,
      publishStatus: ps, publishDate: publishDate || undefined,
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
        toast.success(ps === "PUBLISHED" ? "Curso publicado" : "Borrador guardado");
        const pendingFile = (coverInputRef.current as any)?.__pendingFile;
        if (pendingFile && actId) { const fd = new FormData(); fd.append("file", pendingFile); await api.upload(`/activities/${actId}/cover`, fd); }
      }
      navigate("/inscripciones");
    } catch { toast.error("Error al guardar"); }
    setLoading(false);
  }

  const canNext = step === 0 ? title.trim().length > 0 : true;
  const sessionCount = sessions.filter(s => s.title || s.sessionDate).length;
  const previewDate = startDate ? new Date(startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : sessions[0]?.sessionDate ? new Date(sessions[0].sessionDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : null;

  return (
    <div className="h-full flex flex-col">
      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto pt-1 pb-5">
        {/* Stepper */}
        <div className="grid grid-cols-3 gap-0 mb-5 rounded-xl border overflow-hidden">
          {STEPS.map((s, i) => (
            <button key={i} type="button" onClick={() => i <= step + 1 && setStep(i)}
              className={cn("flex items-center gap-3 px-4 py-3 text-left transition-colors border-r last:border-r-0",
                i === step ? "bg-primary/5" : "bg-background",
                i <= step + 1 ? "cursor-pointer hover:bg-muted/50" : "cursor-default opacity-50"
              )}>
              <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors shrink-0",
                i < step ? "bg-emerald-500 text-white" : i === step ? "bg-primary text-white" : "border-2 border-muted-foreground/20 text-muted-foreground"
              )}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className="min-w-0 hidden md:block">
                <p className={cn("text-sm font-semibold truncate", i === step ? "text-foreground" : i < step ? "text-muted-foreground" : "text-muted-foreground/60")}>{s.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* ═══ MAIN AREA ═══ */}
          <div>
            {/* Step 0: Datos */}
            {step === 0 && (
              <div className="space-y-4">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Titulo *</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Curso de cocina vasca" required />
                    </div>

                    <div className="space-y-2">
                      <Label>Descripcion</Label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe el curso: que aprenderan, a quien va dirigido..."
                        className="flex min-h-[70px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>

                    {/* Category chips */}
                    <div className="space-y-2">
                      <Label>Categoria</Label>
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

                    {/* Modality + Location + Instructor in one row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Modalidad</Label>
                        <div className="flex gap-1.5">
                          {[{ v: "presencial", icon: MapPin, l: "Presencial" }, { v: "online", icon: Monitor, l: "Online" }].map(m => (
                            <button key={m.v} type="button" onClick={() => setModality(m.v)}
                              className={cn("flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border transition-colors text-sm font-medium",
                                modality === m.v ? "border-primary bg-primary/5 text-primary" : "border-input text-muted-foreground hover:border-primary/30")}>
                              <m.icon className="h-3.5 w-3.5" />{m.l}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 relative" ref={locationRef}>
                        <Label>{modality === "presencial" ? "Lugar" : "Enlace"}</Label>
                        <Input value={location}
                          onChange={(e) => { setLocation(e.target.value); setSelectedSpaceId(""); if (modality === "presencial") setShowLocationSuggestions(true); }}
                          onFocus={() => { if (modality === "presencial") setShowLocationSuggestions(true); }}
                          placeholder={modality === "presencial" ? "Selecciona espacio..." : "https://meet.google.com/..."} />
                        {modality === "presencial" && showLocationSuggestions && filteredSpaces.length > 0 && (
                          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
                            {filteredSpaces.map((s: any) => (
                              <button key={s.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                                onClick={() => { setLocation(s.name); setSelectedSpaceId(s.id); setShowLocationSuggestions(false); if (!maxCapacity && s.capacity) setMaxCapacity(String(s.capacity)); }}>
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span>{s.name}</span>
                                {s.capacity && <span className="text-xs text-muted-foreground ml-auto">{s.capacity}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Instructor</Label>
                        {instructor ? (
                          <div className="flex items-center gap-2 h-9 px-2 rounded-lg border bg-muted/30">
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-semibold shrink-0", instructor.type === "MEMBER" ? "bg-blue-500" : "bg-orange-500")}>
                              {instructor.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium truncate">{instructor.name}</span>
                            <button type="button" onClick={() => setInstructor(null)} className="ml-auto text-muted-foreground hover:text-destructive shrink-0"><X className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <Button type="button" variant="outline" size="sm" className="w-full h-9" onClick={() => setShowInstructorDialog(true)}>
                            <Plus className="h-3.5 w-3.5 mr-1" />Seleccionar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Card 2: Inscripcion (same step) */}
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">🎟️ Inscripcion</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Modo</Label>
                        <select value={enrollmentMode} onChange={(e) => setEnrollmentMode(e.target.value)}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                          <option value="FIFO">Por orden de inscripcion</option>
                          <option value="LOTTERY">Sorteo</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Plazas</Label>
                        <Input type="number" min="1" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} placeholder="20" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Precio</Label>
                        <div className="relative">
                          <Input type="number" min="0" step="0.01" value={enrollmentPrice} onChange={(e) => setEnrollmentPrice(e.target.value)} placeholder="0" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">€</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fecha limite</Label>
                        <Input type="datetime-local" value={enrollmentDeadline} onChange={(e) => setEnrollmentDeadline(e.target.value)} />
                      </div>
                    </div>
                    {enrollmentMode === "LOTTERY" && (
                      <div className="rounded-lg p-2.5 bg-amber-50 border border-amber-200/50 text-xs text-amber-700">
                        Las inscripciones se recopilan hasta la fecha limite y luego se asignan por sorteo.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 1: Sesiones */}
            {step === 1 && (
              <div className="space-y-5">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">📅 Sesiones</h3>
                    {sessions.map((s, i) => (
                      <div key={i} className="rounded-xl border p-4 bg-muted/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                            <span className="text-sm font-semibold">Sesion {i + 1}</span>
                          </div>
                          {sessions.length > 1 && (
                            <button type="button" onClick={() => setSessions(sessions.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-1"><Label className="text-xs">Fecha</Label><Input type="date" value={s.sessionDate} onChange={(e) => updateSession(i, "sessionDate", e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-xs">Inicio</Label><Input type="time" value={s.timeStart} onChange={(e) => updateSession(i, "timeStart", e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-xs">Fin</Label><Input type="time" value={s.timeEnd} onChange={(e) => updateSession(i, "timeEnd", e.target.value)} /></div>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Titulo</Label><Input value={s.title} onChange={(e) => updateSession(i, "title", e.target.value)} placeholder="Ej: Bases y fondos de la cocina vasca" /></div>
                        <div className="space-y-1"><Label className="text-xs">Contenido</Label>
                          <textarea value={s.content} onChange={(e) => updateSession(i, "content", e.target.value)} placeholder="Describe brevemente que se vera..."
                            className="flex min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addSession}
                      className="w-full py-3 rounded-xl border-2 border-dashed border-muted-foreground/20 text-sm text-primary font-semibold hover:border-primary/40 transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="h-3.5 w-3.5" />Añadir sesion
                    </button>
                  </CardContent>
                </Card>

              </div>
            )}

            {/* Step 2: Resumen */}
            {step === 2 && (
              <div className="space-y-5">
                <Card>
                  <CardContent className="pt-4 space-y-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">✅ Resumen del curso</h3>

                    {/* Cover + title */}
                    <div className="rounded-xl overflow-hidden border">
                      <div className={cn("h-28 flex items-end p-4", coverPreview ? "" : "bg-gradient-to-br from-primary/80 to-primary/60")} style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                        <div>
                          <p className="text-white/70 text-xs uppercase tracking-wider font-semibold">{user?.tenantName || "Asociacion"}</p>
                          <h2 className="text-white text-xl font-bold">{title || "Sin titulo"}</h2>
                        </div>
                      </div>
                    </div>

                    {description && <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>}

                    {/* Key details */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {[
                        { l: "Categoria", v: category || "Sin categoria", icon: "🏷️" },
                        { l: "Modalidad", v: modality === "presencial" ? "Presencial" : "Online", icon: modality === "presencial" ? "📍" : "💻" },
                        { l: "Lugar", v: location || "Sin definir", icon: "📍" },
                        { l: "Precio", v: parseFloat(enrollmentPrice || "0") > 0 ? `${enrollmentPrice}€` : "Gratuito", icon: "💰" },
                        { l: "Plazas", v: maxCapacity || "-", icon: "👥" },
                        { l: "Modo", v: enrollmentMode === "LOTTERY" ? "Sorteo" : "Por orden de inscripcion", icon: "🎟️" },
                      ].map((d, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <p className="text-[11px] text-muted-foreground">{d.icon} {d.l}</p>
                          <p className="text-sm font-semibold mt-0.5">{d.v}</p>
                        </div>
                      ))}
                    </div>

                    {instructor && (
                      <div className="flex items-center gap-2 p-3 rounded-lg border">
                        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold", instructor.type === "MEMBER" ? "bg-blue-500" : "bg-orange-500")}>
                          {instructor.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{instructor.name}</p>
                          <p className="text-xs text-muted-foreground">{instructor.type === "MEMBER" ? "Miembro" : "Contacto externo"}</p>
                        </div>
                      </div>
                    )}

                    {/* Sessions summary */}
                    {sessionCount > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📅 {sessionCount} sesiones</p>
                        {sessions.filter(s => s.title || s.sessionDate).map((s, i) => (
                          <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{i + 1}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{s.title || "Sin titulo"}</p>
                              <p className="text-xs text-muted-foreground">
                                {s.sessionDate ? new Date(s.sessionDate).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" }) : "Fecha por definir"}
                                {s.timeStart && ` · ${s.timeStart}`}{s.timeEnd && `–${s.timeEnd}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200/50 text-sm text-emerald-700">
                      Todo listo. Puedes publicar el curso o guardarlo como borrador para revisarlo mas tarde.
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* ═══ SIDEBAR (preview) ═══ */}
          <div className="hidden lg:block sticky top-[120px] self-start">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="h-3 w-3" />Vista previa
            </p>
            <div className="rounded-xl border overflow-hidden shadow-sm">
              <div className={cn("h-20 relative", coverPreview ? "" : "bg-gradient-to-br from-primary/80 to-primary/60")} style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                {!coverPreview && <span className="absolute inset-0 flex items-center justify-center text-white/30 text-xs">Sin imagen</span>}
              </div>
              <div className="p-3.5 space-y-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{user?.tenantName || "Asociacion"}</p>
                <p className="text-sm font-bold leading-tight">{title || "Titulo del curso"}</p>
                {description && <p className="text-[11px] text-muted-foreground line-clamp-2">{description}</p>}
                <div className="flex flex-wrap gap-1">
                  {previewDate && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><CalendarDays className="h-2.5 w-2.5" />{previewDate}</span>}
                  {location && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{location}</span>}
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Euro className="h-2.5 w-2.5" />{enrollmentPrice && parseFloat(enrollmentPrice) > 0 ? `${enrollmentPrice}€` : "Gratis"}</span>
                  {maxCapacity && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{maxCapacity} plazas</span>}
                  {sessionCount > 0 && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{sessionCount} ses.</span>}
                </div>
                {instructor && (
                  <div className="border-t pt-2 mt-1 flex items-center gap-2">
                    <div className={cn("h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white", instructor.type === "MEMBER" ? "bg-blue-500" : "bg-orange-500")}>{instructor.name?.charAt(0)}</div>
                    <span className="text-[11px] text-muted-foreground">{instructor.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Imagen de portada */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" />Portada
              </p>
              <div className="relative h-24 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-colors overflow-hidden bg-muted/30"
                onClick={() => coverInputRef.current?.click()}>
                {coverPreview ? (
                  <>
                    <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-xs font-medium">Cambiar</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5 mx-auto mb-1 opacity-40" />
                    <p className="text-[11px]">Subir imagen</p>
                  </div>
                )}
                <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setCoverPreview(URL.createObjectURL(f)); (coverInputRef.current as any).__pendingFile = f; } e.target.value = ""; }} />
              </div>
            </div>

            {/* Auto-rellenar con IA */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                📄 Auto-rellenar
              </p>
              {programDoc ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-2.5 py-2 rounded-lg border bg-emerald-50 border-emerald-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium truncate text-emerald-700">{programDoc.fileName}</span>
                    </div>
                    <button type="button" onClick={() => setProgramDoc(null)} className="text-muted-foreground hover:text-destructive shrink-0 ml-1"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="text-[10px] text-emerald-600">Datos extraidos del documento</p>
                </div>
              ) : (
                <div>
                  <Button type="button" variant="outline" size="sm" className="w-full text-xs h-8" disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-3 w-3 mr-1" />{uploading ? "Analizando..." : "Subir PDF/Word"}
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1">La IA rellena el formulario</p>
                  <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploading(true);
                      try {
                        // 1. Analyze with AI
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
                            setSessions(ex.sesiones.map((s: any, i: number) => ({
                              sessionDate: s.sessionDate || "",
                              timeStart: s.timeStart || "18:00",
                              timeEnd: s.timeEnd || "21:00",
                              title: s.title || "",
                              content: s.content || "",
                            })));
                          }
                          toast.success("Datos extraidos del documento");
                        }

                        // 2. Also upload as program document
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer sticky ── */}
      <div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t px-4 md:px-6 lg:px-8 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/inscripciones")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-3.5 w-3.5 inline mr-0.5" />Volver
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => handleSubmit(true)}>
            Guardar borrador
          </Button>
          {step > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />Anterior
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" size="sm" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Siguiente<ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={loading} onClick={() => handleSubmit(false)}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />Publicar curso
            </Button>
          )}
        </div>
      </div>

      {/* Instructor Dialog */}
      <InstructorDialog open={showInstructorDialog} onClose={() => setShowInstructorDialog(false)} members={members} contacts={contacts}
        onSelect={(type, id, name) => { setInstructor({ type, id, name }); setShowInstructorDialog(false); }} />
    </div>
  );
}

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
