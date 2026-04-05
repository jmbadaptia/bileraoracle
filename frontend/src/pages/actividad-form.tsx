import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  CalendarDays, FileText, X, Upload, Plus, Users, MapPin,
  Paperclip, Building2, ChevronDown, Check, Eye, Monitor,
  ImageIcon, Euro,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useActivity, useMembers, useContacts, useDocuments,
  useUploadDocument, useCreateActivity, useUpdateActivity, useSpaces,
} from "@/api/hooks";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS, PUBLIC_ACTIVITY_TYPES, ACTIVITY_TYPE_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from "@/components/tiptap-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

type Participant = {
  id: string; name: string; kind: "member" | "contact"; role?: string; email?: string; category?: string;
};

// ─── Accordion Step ──────────────────────────────────────────────────

function AccordionStep({
  number, title, subtitle, isOpen, isCompleted, onToggle, summaryTags, children, footer,
}: {
  number: number; title: string; subtitle: string; isOpen: boolean; isCompleted: boolean;
  onToggle: () => void; summaryTags?: string[]; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="border-x border-t last:border-b first:rounded-t-xl last:rounded-b-xl overflow-hidden">
      <button type="button" onClick={onToggle}
        className={cn("w-full flex items-start gap-3 px-5 py-4 text-left transition-colors", isOpen ? "bg-muted/40" : "bg-background hover:bg-muted/20")}>
        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
          isCompleted ? "bg-emerald-500 text-white" : isOpen ? "bg-primary text-primary-foreground" : "border-2 border-muted-foreground/20 text-muted-foreground")}>
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-sm font-semibold", isOpen ? "text-primary" : "text-foreground")}>{title}</span>
          {!isOpen && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {!isOpen && isCompleted && summaryTags && summaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {summaryTags.map((tag, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="px-5 pb-5 pt-1 ml-10 space-y-4">
          {children}
          {footer}
        </div>
      )}
    </div>
  );
}

function StepFooter({ onContinue, canContinue = true }: { onContinue: () => void; canContinue?: boolean }) {
  return (
    <div className="flex justify-end pt-2">
      <Button size="sm" disabled={!canContinue} onClick={onContinue}>Continuar</Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function ActividadFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const { data: activity, isLoading: loadingActivity } = useActivity(id || "");
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const { data: contactsData } = useContacts({ limit: "200" });
  const { data: docsData } = useDocuments({ limit: "200" });
  const uploadDocument = useUploadDocument();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");
  const { data: spacesData } = useSpaces({ active: "1" });

  const members = membersData?.members || [];
  const allContacts = contactsData?.contacts || [];
  const allDocs = docsData?.documents || [];
  const spaces = spacesData?.spaces || [];

  // Accordion state
  const [openStep, setOpenStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // Form state
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("EVENT");
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [startDate, setStartDate] = useState(!isEdit ? nowLocal() : "");
  const [locationValue, setLocationValue] = useState("");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [modality, setModality] = useState("presencial");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantDialog, setShowParticipantDialog] = useState(false);
  const [notesContent, setNotesContent] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [enrollmentEnabled, setEnrollmentEnabled] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState("FIFO");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [enrollmentPrice, setEnrollmentPrice] = useState("");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) setShowLocationSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSpaces = spaces.filter((s: any) => s.name.toLowerCase().includes(locationValue.toLowerCase()));

  // Sync state in edit mode
  if (isEdit && activity && !synced) {
    setTitle(activity.title || "");
    setDescription(activity.description || "");
    setSelectedType(activity.type || "EVENT");
    setSelectedStatus(activity.status || "PENDING");
    setStartDate(activity.startDate ? new Date(activity.startDate).toISOString().slice(0, 16) : "");
    setLocationValue(activity.location || "");
    setNotesContent(activity.description || "");
    setSelectedOwnerId(activity.ownerId || "");
    const parts: Participant[] = [];
    if (activity.attendees) for (const a of activity.attendees) parts.push({ id: a.id, name: a.name, kind: "member", email: a.email });
    if (activity.contacts) for (const c of activity.contacts) parts.push({ id: c.id, name: c.name, kind: "contact", role: c.role || "", category: c.category });
    setParticipants(parts);
    if (activity.documents) setSelectedDocuments(activity.documents.map((d: any) => d.id || d.documentId));
    setEnrollmentEnabled(!!activity.enrollmentEnabled);
    setEnrollmentMode(activity.enrollmentMode || "FIFO");
    setMaxCapacity(activity.maxCapacity ? String(activity.maxCapacity) : "");
    setEnrollmentPrice(activity.enrollmentPrice ? String(activity.enrollmentPrice) : "");
    setEnrollmentDeadline(activity.enrollmentDeadline ? activity.enrollmentDeadline.slice(0, 16) : "");
    if (activity.coverImagePath) setCoverPreview(`${API_BASE}/activities/${id}/cover?v=${Date.now()}`);
    setCompleted(new Set([1, 2, 3, 4]));
    setOpenStep(5);
    setSynced(true);
  }

  // Auto-select current user as owner for new activities
  if (!isEdit && !synced && user?.id && members.length > 0) {
    setSelectedOwnerId(user.id);
    const me = members.find((m: any) => m.id === user.id);
    if (me) setParticipants([{ id: me.id, name: me.name, kind: "member", email: me.email }]);
    setSynced(true);
  }

  if (isEdit && loadingActivity) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  async function handleSubmit() {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }
    setLoading(true);

    const attendeeIds = participants.filter(p => p.kind === "member").map(p => p.id);
    const contactIds = participants.filter(p => p.kind === "contact").map(p => ({ id: p.id, role: p.role || undefined }));

    const data: Record<string, any> = {
      ownerId: selectedOwnerId || user!.id,
      type: selectedType,
      status: selectedStatus,
      title: title.trim(),
      startDate: startDate || undefined,
      location: locationValue || undefined,
      description: notesContent || undefined,
      attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      contactIds: contactIds.length > 0 ? contactIds : undefined,
      documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
    };
    if (selectedSpaceId) data.spaceId = selectedSpaceId;
    data.enrollmentEnabled = enrollmentEnabled;
    if (enrollmentEnabled) {
      data.enrollmentMode = enrollmentMode;
      data.maxCapacity = maxCapacity ? parseInt(maxCapacity) : undefined;
      data.enrollmentPrice = enrollmentPrice ? parseFloat(enrollmentPrice) : 0;
      data.enrollmentDeadline = enrollmentDeadline || undefined;
    }

    try {
      if (isEdit) {
        await updateActivity.mutateAsync(data);
        toast.success("Actividad actualizada");
      } else {
        const res: any = await createActivity.mutateAsync(data);
        const pendingFile = (coverInputRef.current as any)?.__pendingFile;
        if (pendingFile && res.id) { const fd = new FormData(); fd.append("file", pendingFile); await (await import("@/lib/api-client")).api.upload(`/activities/${res.id}/cover`, fd); }
        toast.success("Actividad creada");
      }
      navigate("/actividades");
    } catch { toast.error("Error al guardar"); }
    setLoading(false);
  }

  function markComplete(step: number) {
    setCompleted(prev => new Set([...prev, step]));
    setOpenStep(step + 1);
  }
  function toggleStep(step: number) { setOpenStep(openStep === step ? 0 : step); }
  function removeParticipant(pId: string) { setParticipants(prev => prev.filter(p => p.id !== pId)); }

  const isFree = !enrollmentPrice || parseFloat(enrollmentPrice) === 0;
  const previewDate = startDate ? new Date(startDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" }) : null;

  function getSummary(step: number): string[] {
    switch (step) {
      case 1: return [title, ACTIVITY_TYPE_LABELS[selectedType]].filter(Boolean);
      case 2: return [modality === "presencial" ? "Presencial" : "Online", locationValue, previewDate].filter(Boolean) as string[];
      case 3: return enrollmentEnabled ? [isFree ? "Gratis" : `${enrollmentPrice}€`, `${maxCapacity} plazas`].filter(Boolean) : ["Sin inscripción"];
      case 4: return [
        selectedOwnerId ? (members.find((m: any) => m.id === selectedOwnerId)?.name || "") : "",
        participants.length > 0 ? `${participants.length} participantes` : "",
        selectedDocuments.length > 0 ? `${selectedDocuments.length} docs` : "",
      ].filter(Boolean);
      default: return [];
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Editar actividad" : "Nueva actividad"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Completa los pasos para crear la actividad</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button size="sm" disabled={loading || !title.trim()} onClick={handleSubmit}>
            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear actividad"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ═══ LEFT: Accordion ═══ */}
        <div>
          {/* Step 1: Datos básicos */}
          <AccordionStep
            number={1} title="Datos básicos" subtitle="Título, tipo, descripción y portada"
            isOpen={openStep === 1} isCompleted={completed.has(1)} onToggle={() => toggleStep(1)}
            summaryTags={getSummary(1)}
            footer={<StepFooter onContinue={() => markComplete(1)} canContinue={title.trim().length > 0} />}
          >
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Charla sobre reciclaje" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PUBLIC_ACTIVITY_TYPES.map(v => (
                      <SelectItem key={v} value={v}>{ACTIVITY_TYPE_LABELS[v]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_STATUS_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente la actividad..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            </div>
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-colors bg-muted/20 overflow-hidden relative"
                onClick={() => coverInputRef.current?.click()}>
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

          {/* Step 2: Formato y lugar */}
          <AccordionStep
            number={2} title="Formato y lugar" subtitle="Modalidad, ubicación y fecha"
            isOpen={openStep === 2} isCompleted={completed.has(2)} onToggle={() => toggleStep(2)}
            summaryTags={getSummary(2)}
            footer={<StepFooter onContinue={() => markComplete(2)} />}
          >
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
            <div className="space-y-2 relative" ref={locationRef}>
              <Label>{modality === "presencial" ? "Lugar" : "Enlace"}</Label>
              <Input value={locationValue}
                onChange={(e) => { setLocationValue(e.target.value); setSelectedSpaceId(""); if (modality === "presencial") setShowLocationSuggestions(true); }}
                onFocus={() => { if (modality === "presencial") setShowLocationSuggestions(true); }}
                placeholder={modality === "presencial" ? "Selecciona espacio..." : "https://meet.google.com/..."} />
              {modality === "presencial" && showLocationSuggestions && filteredSpaces.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-36 overflow-y-auto">
                  {filteredSpaces.map((s: any) => (
                    <button key={s.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                      onClick={() => { setLocationValue(s.name); setSelectedSpaceId(s.id); setShowLocationSuggestions(false); if (s.capacity) setMaxCapacity(String(s.capacity)); }}>
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span>{s.name}</span>
                      {s.capacity && <span className="text-xs text-muted-foreground ml-auto">{s.capacity}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Fecha y hora</Label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </AccordionStep>

          {/* Step 3: Inscripción (opcional) */}
          <AccordionStep
            number={3} title="Inscripción" subtitle="Plazas, precio y fecha límite (opcional)"
            isOpen={openStep === 3} isCompleted={completed.has(3)} onToggle={() => toggleStep(3)}
            summaryTags={getSummary(3)}
            footer={<StepFooter onContinue={() => markComplete(3)} />}
          >
            <div className="space-y-2">
              <Label>¿Requiere inscripción?</Label>
              <div className="flex gap-2">
                {[{ v: false, l: "No" }, { v: true, l: "Sí, con inscripción" }].map(opt => (
                  <button key={String(opt.v)} type="button" onClick={() => setEnrollmentEnabled(opt.v)}
                    className={cn("flex-1 h-10 rounded-lg border transition-colors text-sm font-medium",
                      enrollmentEnabled === opt.v ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground hover:border-primary/30")}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            {enrollmentEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modo</Label>
                    <select value={enrollmentMode} onChange={(e) => setEnrollmentMode(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                      <option value="FIFO">Por orden</option>
                      <option value="LOTTERY">Sorteo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Plazas</Label>
                    <Input type="number" min="1" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} placeholder="20" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio</Label>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setEnrollmentPrice(isFree ? "" : "0")}
                        className={cn("px-3 py-2 rounded-lg text-sm font-semibold border transition-colors whitespace-nowrap",
                          isFree ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-input text-muted-foreground")}>
                        Gratis
                      </button>
                      {!isFree && (
                        <div className="relative flex-1">
                          <Input type="number" min="0" step="0.01" value={enrollmentPrice} onChange={(e) => setEnrollmentPrice(e.target.value)} />
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
              </>
            )}
          </AccordionStep>

          {/* Step 4: Participantes y documentos */}
          <AccordionStep
            number={4} title="Participantes y documentos" subtitle="Responsable, participantes y adjuntos"
            isOpen={openStep === 4} isCompleted={completed.has(4)} onToggle={() => toggleStep(4)}
            summaryTags={getSummary(4)}
            footer={<StepFooter onContinue={() => markComplete(4)} />}
          >
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={selectedOwnerId || "_none"} onValueChange={(v) => setSelectedOwnerId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin asignar</SelectItem>
                  {members.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Participantes</Label>
              {participants.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {participants.map(p => (
                    <Badge key={`${p.kind}-${p.id}`} variant="secondary" className="gap-1">
                      {p.name}
                      <button type="button" onClick={() => removeParticipant(p.id)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setShowParticipantDialog(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                <Plus className="h-3.5 w-3.5" />Añadir participante
              </button>
            </div>
            <div className="space-y-2">
              <Label>Documentos</Label>
              {selectedDocuments.length > 0 && (
                <div className="space-y-1">
                  {selectedDocuments.map(docId => {
                    const doc = allDocs.find((d: any) => d.id === docId);
                    return (
                      <div key={docId} className="flex items-center justify-between px-3 py-2 rounded-lg border group">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate">{doc?.title || docId}</span>
                        </div>
                        <button type="button" className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setSelectedDocuments(prev => prev.filter(x => x !== docId))}>
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowDocDialog(true)}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors">
                  <Plus className="h-3.5 w-3.5" />Añadir documento
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Upload className="h-3.5 w-3.5" />Subir nuevo
                </button>
                <input ref={fileInputRef} type="file" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const fd = new FormData();
                    fd.append("file", file);
                    fd.append("title", file.name.replace(/\.[^.]+$/, ""));
                    fd.append("sessionType", "OTHER");
                    try {
                      const doc: any = await uploadDocument.mutateAsync(fd);
                      setSelectedDocuments(prev => [...prev, doc.id]);
                      toast.success("Documento subido");
                    } catch { toast.error("Error al subir"); }
                    e.target.value = "";
                  }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas / Acta</Label>
              <TiptapEditor content={notesContent} onChange={setNotesContent} placeholder="Notas adicionales..." />
            </div>
          </AccordionStep>

          {/* Step 5: Resumen */}
          <AccordionStep
            number={5} title="Resumen" subtitle="Revisar y guardar"
            isOpen={openStep === 5} isCompleted={false} onToggle={() => toggleStep(5)}
            footer={
              <div className="flex justify-end gap-2 pt-2">
                <Button size="sm" disabled={loading || !title.trim()} onClick={handleSubmit}>
                  {isEdit ? "Guardar cambios" : "Crear actividad"}
                </Button>
              </div>
            }
          >
            <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
              <h3 className="text-lg font-bold">{title || "Sin título"}</h3>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { l: "Tipo", v: ACTIVITY_TYPE_LABELS[selectedType] || selectedType },
                  { l: "Modalidad", v: modality === "presencial" ? "Presencial" : "Online" },
                  { l: "Lugar", v: locationValue || "—" },
                  { l: "Fecha", v: previewDate || "—" },
                  { l: "Inscripción", v: enrollmentEnabled ? (isFree ? "Gratis" : `${enrollmentPrice}€`) : "Sin inscripción" },
                  { l: "Participantes", v: `${participants.length}` },
                ].map((d, i) => (
                  <div key={i} className="py-2 border-b">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{d.l}</p>
                    <p className="text-sm font-medium mt-0.5">{d.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </AccordionStep>
        </div>

        {/* ═══ RIGHT: Preview Sidebar ═══ */}
        <aside className="hidden lg:block sticky top-[80px] self-start space-y-4">
          <div className="rounded-xl border overflow-hidden">
            <div className={cn("h-24 relative", coverPreview ? "" : "bg-gradient-to-br from-primary/80 to-primary/60")}
              style={coverPreview ? { backgroundImage: `url(${coverPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
              {!coverPreview && <span className="absolute inset-0 flex items-center justify-center text-white/40 text-xs">Sin imagen</span>}
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={`text-[10px] ${ACTIVITY_TYPE_CONFIG[selectedType]?.color || ""}`}>
                  {ACTIVITY_TYPE_LABELS[selectedType]}
                </Badge>
              </div>
              <p className="text-sm font-bold leading-tight">{title || "Título de la actividad"}</p>
              {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {previewDate && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><CalendarDays className="h-2.5 w-2.5" />{previewDate}</span>}
                {locationValue && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{locationValue}</span>}
                {enrollmentEnabled && (
                  <>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Euro className="h-2.5 w-2.5" />{isFree ? "Gratis" : `${enrollmentPrice}€`}</span>
                    {maxCapacity && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded flex items-center gap-0.5"><Users className="h-2.5 w-2.5" />{maxCapacity} plazas</span>}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Detail rows */}
          <div className="rounded-xl border divide-y">
            {selectedOwnerId && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Responsable</p>
                <p className="text-sm font-medium mt-0.5">{members.find((m: any) => m.id === selectedOwnerId)?.name || "—"}</p>
              </div>
            )}
            {participants.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Participantes</p>
                <p className="text-sm font-medium mt-0.5">{participants.map(p => p.name).join(", ")}</p>
              </div>
            )}
            {selectedDocuments.length > 0 && (
              <div className="p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Documentos</p>
                <p className="text-sm font-medium mt-0.5">{selectedDocuments.length} adjunto(s)</p>
              </div>
            )}
            {!selectedOwnerId && participants.length === 0 && selectedDocuments.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Completa los pasos para ver la vista previa</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Dialogs */}
      <AddParticipantDialog open={showParticipantDialog} onClose={() => setShowParticipantDialog(false)}
        existingIds={participants.map(p => `${p.kind}-${p.id}`)} members={members} contacts={allContacts}
        onAdd={(p) => setParticipants(prev => [...prev, p])} />
      <AttachDocDialog open={showDocDialog} onClose={() => setShowDocDialog(false)}
        existingDocIds={selectedDocuments} allDocs={allDocs}
        onAttach={(docId) => setSelectedDocuments(prev => [...prev, docId])}
        onUpload={async (file) => {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("title", file.name.replace(/\.[^.]+$/, ""));
          fd.append("sessionType", "OTHER");
          try {
            const doc: any = await uploadDocument.mutateAsync(fd);
            setSelectedDocuments(prev => [...prev, doc.id]);
            toast.success("Documento subido y adjuntado");
          } catch { toast.error("Error al subir"); }
        }} />
    </div>
  );
}

// ─── Add Participant Dialog ──────────────────────────────────────────

function AddParticipantDialog({ open, onClose, existingIds, members, contacts, onAdd }: {
  open: boolean; onClose: () => void; existingIds: string[]; members: any[]; contacts: any[];
  onAdd: (p: Participant) => void;
}) {
  const [tab, setTab] = useState<"members" | "contacts">("members");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const filtered = tab === "members"
    ? members.filter((m: any) => !existingIds.includes(`member-${m.id}`) && m.name.toLowerCase().includes(search.toLowerCase()))
    : contacts.filter((c: any) => !existingIds.includes(`contact-${c.id}`) && c.name.toLowerCase().includes(search.toLowerCase()));

  function handleSelect(item: any) {
    if (tab === "members") onAdd({ id: item.id, name: item.name, kind: "member", email: item.email });
    else { onAdd({ id: item.id, name: item.name, kind: "contact", role: role.trim(), category: item.category }); setRole(""); }
    setSearch(""); onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Añadir participante</DialogTitle></DialogHeader>
        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button type="button" className={`flex-1 text-sm py-1.5 rounded-md transition-all ${tab === "members" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setTab("members"); setSearch(""); }}>Miembros</button>
          <button type="button" className={`flex-1 text-sm py-1.5 rounded-md transition-all ${tab === "contacts" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => { setTab("contacts"); setSearch(""); }}>Contactos externos</button>
        </div>
        <Input placeholder={tab === "members" ? "Buscar miembro..." : "Buscar contacto..."} value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        {tab === "contacts" && <Input placeholder="Rol: ponente, organizador... (opcional)" value={role} onChange={(e) => setRole(e.target.value)} />}
        <div className="max-h-60 overflow-y-auto space-y-0.5">
          {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">Sin resultados</p> :
            filtered.map((item: any) => (
              <button key={item.id} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                onClick={() => handleSelect(item)}>
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                  tab === "members" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700")}>
                  {item.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.email && <p className="text-xs text-muted-foreground truncate">{item.email}</p>}
                </div>
              </button>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attach Document Dialog ──────────────────────────────────────────

function AttachDocDialog({ open, onClose, existingDocIds, allDocs, onAttach, onUpload }: {
  open: boolean; onClose: () => void; existingDocIds: string[]; allDocs: any[];
  onAttach: (docId: string) => void; onUpload: (file: File) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"existing" | "upload">("existing");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = allDocs.filter((d: any) => !existingDocIds.includes(d.id) && (d.title.toLowerCase().includes(search.toLowerCase()) || d.fileName.toLowerCase().includes(search.toLowerCase())));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(""); setTab("existing"); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Adjuntar documento</DialogTitle></DialogHeader>
        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button type="button" className={`flex-1 text-sm py-1.5 rounded-md transition-all ${tab === "existing" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("existing")}>Existente</button>
          <button type="button" className={`flex-1 text-sm py-1.5 rounded-md transition-all ${tab === "upload" ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab("upload")}>Subir nuevo</button>
        </div>
        {tab === "existing" ? (
          <>
            <Input placeholder="Buscar documento..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            <div className="max-h-60 overflow-y-auto space-y-0.5">
              {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No hay documentos</p> :
                filtered.map((doc: any) => (
                  <button key={doc.id} type="button" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                    onClick={() => { onAttach(doc.id); onClose(); }}>
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                    </div>
                  </button>
                ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed py-10 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => fileRef.current?.click()}>
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">Haz clic para seleccionar</p>
            <input ref={fileRef} type="file" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) { onUpload(file); onClose(); } e.target.value = ""; }} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
