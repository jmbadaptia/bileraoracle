import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  CalendarDays,
  GraduationCap,
  CheckSquare,
  Handshake,
  MoreHorizontal,
  Check,
  ChevronDown,
  X,
  Upload,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useActivity,
  useCreateActivity,
  useUpdateActivity,
  useMembers,
  useContacts,
  useSpaces,
} from "@/api/hooks";
import { api } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import {
  ACTIVITY_PIPELINE_LABELS,
  ACTIVITY_STATUS_LABELS,
  PRIORITY_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Type catalog ────────────────────────────────────────────────────
type ActivityType = "EVENT" | "CURSO" | "TASK" | "MEETING" | "OTHER";

const TYPE_OPTIONS: { value: ActivityType; label: string; tagline: string; icon: any }[] = [
  { value: "EVENT",   label: "Evento",        tagline: "Acto, charla, concierto…",   icon: CalendarDays },
  { value: "CURSO",   label: "Curso / Taller",tagline: "Con inscripción pública",     icon: GraduationCap },
  { value: "TASK",    label: "Tarea",         tagline: "Gestión interna",             icon: CheckSquare },
  { value: "MEETING", label: "Reunión",       tagline: "Junta, comisión…",            icon: Handshake },
  { value: "OTHER",   label: "Otros",         tagline: "Cualquier otra cosa",         icon: MoreHorizontal },
];

const PUBLIC_TYPES: ActivityType[] = ["EVENT", "CURSO", "OTHER"];
const PIPELINE_TYPES: ActivityType[] = ["EVENT", "CURSO", "OTHER"]; // use DRAFT/PUBLISHED pipeline

function isPublicType(t: ActivityType) {
  return PUBLIC_TYPES.includes(t);
}
function usesPipeline(t: ActivityType) {
  return PIPELINE_TYPES.includes(t);
}

// ─── Accordion step shell (same look as inscripcion-form) ────────────
function AccordionStep({
  number, title, subtitle, isOpen, isCompleted, onToggle, summary, children, footer,
}: {
  number: number;
  title: string;
  subtitle: string;
  isOpen: boolean;
  isCompleted: boolean;
  onToggle: () => void;
  summary?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="border-x border-t last:border-b first:rounded-t-xl last:rounded-b-xl overflow-hidden">
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
            isCompleted ? "bg-emerald-500 text-white"
              : isOpen ? "bg-primary text-primary-foreground"
              : "border-2 border-muted-foreground/20 text-muted-foreground",
          )}
        >
          {isCompleted ? <Check className="h-3.5 w-3.5" /> : number}
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn("text-sm font-semibold", isOpen ? "text-primary" : "text-foreground")}>{title}</span>
          {!isOpen && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          {!isOpen && isCompleted && summary && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{summary}</p>
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

type SessionDraft = {
  sessionDate: string;
  timeStart: string;
  timeEnd: string;
  title: string;
  content: string;
};

// ─── Wizard page ─────────────────────────────────────────────────────
export function ActivityWizardPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const { data: existing, isLoading: loadingExisting } = useActivity(id || "");
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const { data: contactsData } = useContacts({ limit: "200" });
  const { data: spacesData } = useSpaces({ active: "1" });
  const members = membersData?.members || [];
  const contacts = contactsData?.contacts || [];
  const spaces = spacesData?.spaces || [];

  // Type
  const initialType = (searchParams.get("type") as ActivityType) || "EVENT";
  const [type, setType] = useState<ActivityType>(initialType);

  // Step 1 — Básicos
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — Detalles
  const [startDate, setStartDate] = useState("");
  const [location, setLocation] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — Participantes
  const [ownerId, setOwnerId] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [contactPicks, setContactPicks] = useState<string[]>([]);
  const [instructorPick, setInstructorPick] = useState<{ type: "member" | "contact"; id: string } | null>(null);

  // Step 4 — Inscripción
  const [enrollmentEnabled, setEnrollmentEnabled] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState("FIFO");
  const [maxCapacity, setMaxCapacity] = useState("20");
  const [enrollmentPrice, setEnrollmentPrice] = useState("0");
  const [enrollmentDeadline, setEnrollmentDeadline] = useState("");

  // Step 5 — Programa/Sesiones
  const [programText, setProgramText] = useState("");
  const [sessions, setSessions] = useState<SessionDraft[]>([
    { sessionDate: "", timeStart: "18:00", timeEnd: "20:00", title: "", content: "" },
  ]);

  // Step 6 — Publicación
  const [publishWeb, setPublishWeb] = useState(true);
  const [pipelineStatus, setPipelineStatus] = useState("PUBLISHED"); // for public types
  const [internalStatus, setInternalStatus] = useState("PENDING");   // for TASK/MEETING

  const [openStep, setOpenStep] = useState(1);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [synced, setSynced] = useState(false);
  const [saving, setSaving] = useState(false);

  // Force CURSO to always have enrollment on
  useEffect(() => {
    if (type === "CURSO") setEnrollmentEnabled(true);
  }, [type]);

  // Auto-select current user as owner / attendee for new public activities
  useEffect(() => {
    if (isEdit || synced) return;
    if (!user?.id) return;
    if (type === "TASK") {
      setOwnerId((prev) => prev || user.id);
    } else if (type === "EVENT" || type === "OTHER") {
      setOwnerId((prev) => prev || user.id);
      setAttendeeIds((prev) => (prev.length > 0 ? prev : [user.id]));
    }
  }, [isEdit, synced, user?.id, type]);

  // Sync existing in edit mode
  useEffect(() => {
    if (!isEdit || !existing || synced) return;
    const t = (existing.type === "TALLER" ? "CURSO" : existing.type) as ActivityType;
    setType(t);
    setTitle(existing.title || "");
    setDescription(existing.description || "");
    setStartDate(existing.startDate ? String(existing.startDate).slice(0, 16) : "");
    setLocation(existing.location || "");
    setPriority(existing.priority || "MEDIUM");
    setOwnerId(existing.ownerId || "");
    if (Array.isArray(existing.attendees)) setAttendeeIds(existing.attendees.map((a: any) => a.id));
    if (Array.isArray(existing.contacts)) setContactPicks(existing.contacts.map((c: any) => c.id));
    setEnrollmentEnabled(!!existing.enrollmentEnabled);
    setEnrollmentMode(existing.enrollmentMode || "FIFO");
    setMaxCapacity(existing.maxCapacity ? String(existing.maxCapacity) : "20");
    setEnrollmentPrice(existing.enrollmentPrice != null ? String(existing.enrollmentPrice) : "0");
    setEnrollmentDeadline(existing.enrollmentDeadline ? String(existing.enrollmentDeadline).slice(0, 16) : "");
    setProgramText(existing.programText || "");
    if (existing.instructorId) {
      setInstructorPick({ type: existing.instructorType === "contact" ? "contact" : "member", id: existing.instructorId });
    }
    setPublishWeb((existing.visibility || "GENERAL") === "GENERAL");
    if (usesPipeline(t)) setPipelineStatus(existing.status || "DRAFT");
    else setInternalStatus(existing.status || "PENDING");
    if (existing.coverImagePath) {
      setCoverPreview(api.streamUrl(`/activities/${id}/cover?v=${Date.now()}`));
    }
    setCompleted(new Set([1, 2, 3, 4, 5]));
    setOpenStep(6);
    setSynced(true);
  }, [isEdit, existing, synced, id]);

  const showStep4 = type === "CURSO" || type === "EVENT" || type === "OTHER";
  const showStep5 = type === "CURSO";

  const totalSteps = useMemo(() => {
    const base = [1, 2, 3];
    if (showStep4) base.push(4);
    if (showStep5) base.push(5);
    base.push(6);
    return base;
  }, [showStep4, showStep5]);

  function toggleStep(n: number) { setOpenStep((curr) => (curr === n ? 0 : n)); }
  function markComplete(step: number) {
    setCompleted((prev) => new Set(prev).add(step));
    const idx = totalSteps.indexOf(step);
    if (idx >= 0 && idx < totalSteps.length - 1) setOpenStep(totalSteps[idx + 1]);
  }

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  function toggleAttendee(mid: string) {
    setAttendeeIds((prev) => (prev.includes(mid) ? prev.filter((x) => x !== mid) : [...prev, mid]));
  }
  function toggleContact(cid: string) {
    setContactPicks((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));
  }

  function addSession() {
    setSessions((prev) => [...prev, { sessionDate: "", timeStart: "18:00", timeEnd: "20:00", title: "", content: "" }]);
  }
  function removeSession(i: number) {
    setSessions((prev) => prev.filter((_, idx) => idx !== i));
  }
  function updateSession(i: number, patch: Partial<SessionDraft>) {
    setSessions((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }

  async function handleSubmit(asDraft: boolean) {
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }
    setSaving(true);
    const useStatus = usesPipeline(type)
      ? (asDraft ? "DRAFT" : pipelineStatus)
      : internalStatus;

    const data: Record<string, any> = {
      type,
      title: title.trim(),
      description: description.trim() || undefined,
      status: useStatus,
      startDate: startDate || undefined,
      location: location.trim() || undefined,
      ownerId: ownerId || user!.id,
      visibility: publishWeb && isPublicType(type) ? "GENERAL" : "PRIVATE",
    };
    if (type === "TASK") data.priority = priority;
    if (spaceId) data.spaceId = spaceId;

    // Participants by type
    if (type === "EVENT" || type === "OTHER" || type === "MEETING") {
      if (attendeeIds.length > 0) data.attendeeIds = attendeeIds;
    }
    if (type === "EVENT" || type === "OTHER") {
      if (contactPicks.length > 0) data.contactIds = contactPicks.map((id) => ({ id }));
    }
    if (type === "CURSO" && instructorPick) {
      data.instructorType = instructorPick.type;
      data.instructorId = instructorPick.id;
    }

    // Enrollment
    const needsEnrollment = (type === "CURSO") || ((type === "EVENT" || type === "OTHER") && enrollmentEnabled);
    data.enrollmentEnabled = needsEnrollment;
    if (needsEnrollment) {
      data.enrollmentMode = enrollmentMode;
      data.maxCapacity = maxCapacity ? parseInt(maxCapacity) : undefined;
      data.enrollmentPrice = enrollmentPrice ? parseFloat(enrollmentPrice) : 0;
      data.enrollmentDeadline = enrollmentDeadline || undefined;
    }

    // CURSO extras
    if (type === "CURSO") {
      if (programText.trim()) data.programText = programText.trim();
      const validSessions = sessions.filter((s) => s.sessionDate || s.title);
      if (validSessions.length > 0) data.sessions = validSessions;
    }

    try {
      let actId = id;
      if (isEdit) {
        await updateActivity.mutateAsync(data);
      } else {
        const res: any = await createActivity.mutateAsync(data);
        actId = res.id;
      }
      if (coverFile && actId) {
        const fd = new FormData();
        fd.append("file", coverFile);
        await api.upload(`/activities/${actId}/cover`, fd);
      }
      toast.success(isEdit ? "Actividad actualizada" : "Actividad creada");
      navigate(`/actividades/${actId}`);
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar");
    }
    setSaving(false);
  }

  if (isEdit && loadingExisting) return <div className="p-8 text-muted-foreground">Cargando...</div>;

  const typeInfo = TYPE_OPTIONS.find((o) => o.value === type)!;
  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Editar actividad" : "Nueva actividad"}</h1>
          <p className="text-muted-foreground">Completa los pasos para publicar tu {typeInfo.label.toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={saving} onClick={() => navigate(-1)}>Cancelar</Button>
          {usesPipeline(type) && (
            <Button variant="outline" disabled={saving || !title.trim()} onClick={() => handleSubmit(true)}>
              Guardar borrador
            </Button>
          )}
          <Button disabled={saving || !title.trim()} onClick={() => handleSubmit(false)}>
            {saving ? "Guardando..." : isEdit ? "Guardar" : usesPipeline(type) ? "Publicar" : "Crear"}
          </Button>
        </div>
      </div>

      <div>
        {/* Step 1 — Tipo + básicos */}
        <AccordionStep
          number={1} title="Tipo y datos básicos" subtitle="Qué es y cómo se llama"
          isOpen={openStep === 1} isCompleted={completed.has(1)} onToggle={() => toggleStep(1)}
          summary={title ? `${typeInfo.label} · ${title}` : undefined}
          footer={<StepFooter onContinue={() => markComplete(1)} canContinue={!!title.trim()} />}
        >
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = type === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setType(opt.value)} disabled={isEdit}
                    className={cn(
                      "flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors",
                      active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-input hover:bg-muted/30",
                      isEdit && "opacity-60 cursor-not-allowed",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-sm font-semibold leading-tight">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight">{opt.tagline}</div>
                  </button>
                );
              })}
            </div>
            {isEdit && <p className="text-xs text-muted-foreground">El tipo no se puede cambiar después de crear.</p>}
          </div>
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la actividad" />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4}
              placeholder="Describe brevemente de qué trata..." />
          </div>
        </AccordionStep>

        {/* Step 2 — Detalles */}
        <AccordionStep
          number={2} title="Detalles" subtitle="Fecha, lugar y portada"
          isOpen={openStep === 2} isCompleted={completed.has(2)} onToggle={() => toggleStep(2)}
          summary={startDate ? new Date(startDate).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : undefined}
          footer={<StepFooter onContinue={() => markComplete(2)} />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{type === "TASK" ? "Fecha límite" : "Fecha y hora"}</Label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {type !== "TASK" && (
              <div className="space-y-2">
                <Label>Espacio / Lugar</Label>
                <div className="flex gap-2">
                  <Select value={spaceId || "_free"} onValueChange={(v) => {
                    if (v === "_free") { setSpaceId(""); return; }
                    setSpaceId(v);
                    const s = spaces.find((sp: any) => sp.id === v);
                    if (s) setLocation(s.name);
                  }}>
                    <SelectTrigger className="w-[40%]"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_free">Libre</SelectItem>
                      {spaces.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input className="flex-1" value={location} onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ubicación (libre o del espacio seleccionado)" />
                </div>
              </div>
            )}
            {type === "TASK" && (
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABELS).map(([k, l]) => (<SelectItem key={k} value={k}>{l}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isPublicType(type) && (
            <div className="space-y-2">
              <Label>Imagen de portada</Label>
              <div
                className="relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary/40 transition-colors bg-muted/20 overflow-hidden aspect-video"
                onClick={() => coverInputRef.current?.click()}
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Arrastra o haz clic para subir</p>
                  </>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
            </div>
          )}
        </AccordionStep>

        {/* Step 3 — Participantes */}
        <AccordionStep
          number={3} title={type === "TASK" ? "Asignación" : type === "CURSO" ? "Instructor" : "Participantes"}
          subtitle={type === "TASK" ? "Responsable" : type === "CURSO" ? "Quién imparte el curso" : "Miembros y colaboradores"}
          isOpen={openStep === 3} isCompleted={completed.has(3)} onToggle={() => toggleStep(3)}
          footer={<StepFooter onContinue={() => markComplete(3)} />}
        >
          {type === "TASK" && (
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={ownerId || "_none"} onValueChange={(v) => setOwnerId(v === "_none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin asignar</SelectItem>
                  {members.map((m: any) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "CURSO" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Instructor</Label>
                <Select
                  value={instructorPick ? `${instructorPick.type}:${instructorPick.id}` : "_none"}
                  onValueChange={(v) => {
                    if (v === "_none") { setInstructorPick(null); return; }
                    const [t, id] = v.split(":");
                    setInstructorPick({ type: t as "member" | "contact", id });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Sin instructor asignado" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Sin instructor</SelectItem>
                    {members.length > 0 && (
                      <div className="text-[11px] px-2 py-1 text-muted-foreground">Miembros</div>
                    )}
                    {members.map((m: any) => (<SelectItem key={`m:${m.id}`} value={`member:${m.id}`}>{m.name}</SelectItem>))}
                    {contacts.length > 0 && (
                      <div className="text-[11px] px-2 py-1 text-muted-foreground">Colaboradores</div>
                    )}
                    {contacts.map((c: any) => (<SelectItem key={`c:${c.id}`} value={`contact:${c.id}`}>{c.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(type === "EVENT" || type === "OTHER" || type === "MEETING") && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Miembros</Label>
                {attendeeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attendeeIds.map((mid) => {
                      const m = members.find((x: any) => x.id === mid);
                      if (!m) return null;
                      return (
                        <Badge key={mid} variant="secondary" className="gap-1">
                          {m.name}
                          <button type="button" onClick={() => toggleAttendee(mid)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-48 overflow-y-auto rounded border">
                  {members.filter((m: any) => !attendeeIds.includes(m.id)).map((m: any) => (
                    <button key={m.id} type="button" onClick={() => toggleAttendee(m.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                      {m.name}
                    </button>
                  ))}
                  {members.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No hay miembros disponibles</p>
                  )}
                </div>
              </div>

              {(type === "EVENT" || type === "OTHER") && (
                <div className="space-y-2">
                  <Label>Colaboradores (externos)</Label>
                  {contactPicks.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {contactPicks.map((cid) => {
                        const c = contacts.find((x: any) => x.id === cid);
                        if (!c) return null;
                        return (
                          <Badge key={cid} variant="outline" className="gap-1">
                            {c.name}
                            <button type="button" onClick={() => toggleContact(cid)} className="hover:text-destructive">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto rounded border">
                    {contacts.filter((c: any) => !contactPicks.includes(c.id)).map((c: any) => (
                      <button key={c.id} type="button" onClick={() => toggleContact(c.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                        {c.name}{c.category ? <span className="text-muted-foreground"> · {c.category}</span> : null}
                      </button>
                    ))}
                    {contacts.length === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">No hay colaboradores disponibles</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </AccordionStep>

        {/* Step 4 — Inscripción */}
        {showStep4 && (
          <AccordionStep
            number={4} title="Inscripción" subtitle="¿Requiere inscripción? ¿Cómo?"
            isOpen={openStep === 4} isCompleted={completed.has(4)} onToggle={() => toggleStep(4)}
            footer={<StepFooter onContinue={() => markComplete(4)} />}
          >
            {type !== "CURSO" && (
              <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/30">
                <Checkbox checked={enrollmentEnabled} onCheckedChange={(v) => setEnrollmentEnabled(!!v)} className="mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-sm">Requiere inscripción pública</div>
                  <p className="text-xs text-muted-foreground">
                    Al marcar, se genera un enlace público donde la gente puede inscribirse.
                  </p>
                </div>
              </label>
            )}

            {enrollmentEnabled && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Modo</Label>
                    <Select value={enrollmentMode} onValueChange={setEnrollmentMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIFO">Por orden de inscripción</SelectItem>
                        <SelectItem value="LOTTERY">Sorteo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Plazas</Label>
                    <Input type="number" min="1" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Precio (€)</Label>
                    <Input type="number" min="0" step="0.01" value={enrollmentPrice} onChange={(e) => setEnrollmentPrice(e.target.value)} placeholder="0 = gratis" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha límite de inscripción</Label>
                    <Input type="datetime-local" value={enrollmentDeadline} onChange={(e) => setEnrollmentDeadline(e.target.value)} />
                  </div>
                </div>
                {enrollmentMode === "LOTTERY" && (
                  <div className="rounded-lg p-3 bg-amber-50 border border-amber-200/50 text-sm text-amber-700">
                    Las inscripciones se recopilan hasta la fecha límite y luego se asignan por sorteo.
                  </div>
                )}
              </div>
            )}
          </AccordionStep>
        )}

        {/* Step 5 — Programa + Sesiones */}
        {showStep5 && (
          <AccordionStep
            number={5} title="Programa y sesiones" subtitle="Contenidos y fechas"
            isOpen={openStep === 5} isCompleted={completed.has(5)} onToggle={() => toggleStep(5)}
            footer={<StepFooter onContinue={() => markComplete(5)} />}
          >
            <div className="space-y-2">
              <Label>Programa / contenido</Label>
              <Textarea rows={4} value={programText} onChange={(e) => setProgramText(e.target.value)}
                placeholder="Qué se va a enseñar, materiales, requisitos previos..." />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Sesiones</Label>
                <Button type="button" size="sm" variant="outline" onClick={addSession}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir sesión
                </Button>
              </div>
              <div className="space-y-3">
                {sessions.map((s, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">Sesión {i + 1}</span>
                      {sessions.length > 1 && (
                        <button type="button" onClick={() => removeSession(i)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input type="date" value={s.sessionDate} onChange={(e) => updateSession(i, { sessionDate: e.target.value })} />
                      <Input type="time" value={s.timeStart} onChange={(e) => updateSession(i, { timeStart: e.target.value })} />
                      <Input type="time" value={s.timeEnd} onChange={(e) => updateSession(i, { timeEnd: e.target.value })} />
                    </div>
                    <Input value={s.title} onChange={(e) => updateSession(i, { title: e.target.value })} placeholder="Título de la sesión (opcional)" />
                  </div>
                ))}
              </div>
            </div>
          </AccordionStep>
        )}

        {/* Step 6 — Resumen + publicación */}
        <AccordionStep
          number={6} title="Resumen y publicación" subtitle="Revisa y guarda"
          isOpen={openStep === 6} isCompleted={false} onToggle={() => toggleStep(6)}
        >
          <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{title || "Sin título"}</span>
              <Badge variant="outline" className="ml-auto">{typeInfo.label}</Badge>
            </div>
            {description && <p className="text-muted-foreground">{description}</p>}
            {startDate && <div className="text-muted-foreground">📅 {new Date(startDate).toLocaleString("es-ES")}</div>}
            {location && <div className="text-muted-foreground">📍 {location}</div>}
            {type === "CURSO" && enrollmentEnabled && (
              <div className="text-muted-foreground">
                Inscripción {enrollmentMode === "FIFO" ? "por orden" : "por sorteo"} · {maxCapacity} plazas · {parseFloat(enrollmentPrice) > 0 ? `${enrollmentPrice} €` : "Gratis"}
              </div>
            )}
          </div>

          {usesPipeline(type) && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={pipelineStatus} onValueChange={setPipelineStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_PIPELINE_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!usesPipeline(type) && (
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={internalStatus} onValueChange={setInternalStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_STATUS_LABELS).map(([v, l]) => (<SelectItem key={v} value={v}>{l}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isPublicType(type) && (
            <label className="flex items-start gap-3 cursor-pointer rounded-lg border p-3 hover:bg-muted/30">
              <Checkbox checked={publishWeb} onCheckedChange={(v) => setPublishWeb(!!v)} className="mt-0.5" />
              <div className="space-y-1">
                <div className="font-medium text-sm">Publicar en la web</div>
                <p className="text-xs text-muted-foreground">
                  Si está marcado, esta actividad aparece en la página pública de tu asociación cuando esté en estado Publicado.
                </p>
              </div>
            </label>
          )}
        </AccordionStep>
      </div>
    </div>
  );
}
