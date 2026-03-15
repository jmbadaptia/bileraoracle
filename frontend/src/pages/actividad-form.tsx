import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  CalendarDays, FileText, X, Upload, Plus, Users, MapPin,
  Paperclip, ClipboardList, UserCircle, Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useActivity,
  useMembers,
  useContacts,
  useDocuments,
  useUploadDocument,
  useCreateActivity,
  useUpdateActivity,
  useSpaces,
} from "@/api/hooks";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TiptapEditor } from "@/components/tiptap-editor";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

type Participant = {
  id: string;
  name: string;
  kind: "member" | "contact";
  role?: string;
  email?: string;
  category?: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-400",
  IN_PROGRESS: "bg-blue-400",
  DONE: "bg-green-400",
};

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-3 border-b">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

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

  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(activity?.type || "MEETING");
  const [selectedStatus, setSelectedStatus] = useState(activity?.status || "PENDING");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantDialog, setShowParticipantDialog] = useState(false);
  const [notesContent, setNotesContent] = useState(activity?.description || "");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [synced, setSynced] = useState(false);
  const [locationValue, setLocationValue] = useState(activity?.location || "");
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    s.name.toLowerCase().includes(locationValue.toLowerCase())
  );

  // Sync state when activity loads (edit mode)
  if (isEdit && activity && !synced) {
    setSelectedType(activity.type);
    setSelectedStatus(activity.status || "PENDING");
    setNotesContent(activity.description || "");
    setSelectedOwnerId(activity.ownerId || "");

    const parts: Participant[] = [];
    if (activity.attendees) {
      for (const a of activity.attendees) {
        parts.push({ id: a.id, name: a.name, kind: "member", email: a.email });
      }
    }
    if (activity.contacts) {
      for (const c of activity.contacts) {
        parts.push({ id: c.id, name: c.name, kind: "contact", role: c.role || "", category: c.category });
      }
    }
    setParticipants(parts);

    if (activity.documents) {
      setSelectedDocuments(activity.documents.map((d: any) => d.id || d.documentId));
    }
    setLocationValue(activity.location || "");
    setSynced(true);
  }

  // Auto-select current user as owner for new activities
  if (!isEdit && !synced && user?.id && members.length > 0) {
    setSelectedOwnerId(user.id);
    const me = members.find((m: any) => m.id === user.id);
    if (me) {
      setParticipants([{ id: me.id, name: me.name, kind: "member", email: me.email }]);
    }
    setSynced(true);
  }

  if (isEdit && loadingActivity) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const ownerId = selectedOwnerId || user!.id;

    const attendeeIds = participants
      .filter((p) => p.kind === "member")
      .map((p) => p.id);
    const contactIds = participants
      .filter((p) => p.kind === "contact")
      .map((p) => ({ id: p.id, role: p.role || undefined }));

    const data: Record<string, any> = {
      ownerId,
      type: selectedType,
      status: selectedStatus,
      title: formData.get("title") as string,
      startDate: (formData.get("startDate") as string) || undefined,
      location: locationValue || undefined,
      description: notesContent || undefined,
      attendeeIds: attendeeIds.length > 0 ? attendeeIds : undefined,
      contactIds: contactIds.length > 0 ? contactIds : undefined,
      documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
    };
    if (selectedSpaceId) {
      data.spaceId = selectedSpaceId;
    }

    try {
      if (isEdit) {
        await updateActivity.mutateAsync(data);
        toast.success("Actividad actualizada correctamente");
      } else {
        await createActivity.mutateAsync(data);
        toast.success("Actividad creada correctamente");
      }
      navigate("/actividades");
    } catch {
      toast.error("Error al guardar la actividad");
    }

    setLoading(false);
  }

  function removeParticipant(pId: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== pId));
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <CalendarDays className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar actividad" : "Nueva actividad"}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Title */}
        <div>
          <input
            id="title"
            name="title"
            required
            defaultValue={activity?.title}
            placeholder="Título de la actividad..."
            className="w-full text-lg font-semibold bg-transparent border-b border-border pb-3 outline-none placeholder:text-muted-foreground/40 focus:border-primary transition-colors"
          />
        </div>

        {/* Section: Información básica */}
        <section className="space-y-4">
          <SectionHeader icon={ClipboardList} title="Información básica" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Estado</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[value] || "bg-gray-400"}`} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input
                id="startDate"
                name="startDate"
                type="datetime-local"
                defaultValue={
                  activity?.startDate
                    ? new Date(activity.startDate).toISOString().slice(0, 16)
                    : !isEdit ? nowLocal() : ""
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Lugar</Label>
              <div className="relative" ref={locationRef}>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Input
                  id="location"
                  value={locationValue}
                  onChange={(e) => {
                    setLocationValue(e.target.value);
                    setSelectedSpaceId("");
                    setShowLocationSuggestions(true);
                  }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  placeholder="Ej: Sala de juntas / Teams"
                  className="pl-9"
                  autoComplete="off"
                />
                {showLocationSuggestions && filteredSpaces.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                    {filteredSpaces.map((space: any) => (
                      <button
                        key={space.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
                        onClick={() => {
                          setLocationValue(space.name);
                          setSelectedSpaceId(space.id);
                          setShowLocationSuggestions(false);
                        }}
                      >
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="truncate">{space.name}</span>
                        {space.capacity && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">
                            {space.capacity} pers.
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Personas */}
        <section className="space-y-4">
          <SectionHeader icon={Users} title="Personas" />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Responsable</Label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-xs"
              >
                <option value="">Seleccionar responsable</option>
                {members.map((member: any) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Participantes</Label>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground py-1">
                Sin participantes a&ntilde;adidos.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => (
                  <span
                    key={`${p.kind}-${p.id}`}
                    className={`inline-flex items-center gap-1.5 rounded-full border pl-3 pr-1.5 py-1 text-sm ${
                      p.kind === "member"
                        ? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
                        : "bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-200"
                    }`}
                  >
                    <span className="truncate max-w-[140px]">{p.name}</span>
                    {p.role && (
                      <span className="text-[10px] opacity-70">({p.role})</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.id)}
                      className="flex items-center justify-center h-5 w-5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowParticipantDialog(true)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors pt-1"
            >
              <Plus className="h-3.5 w-3.5" />
              A&ntilde;adir participante
            </button>
          </div>
        </section>

        {/* Section: Contenido */}
        <section className="space-y-4">
          <SectionHeader icon={FileText} title="Contenido" />

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notas / Acta</Label>
            <TiptapEditor
              content={notesContent}
              onChange={setNotesContent}
              placeholder="Escribe aqu&iacute; el acta..."
            />
          </div>
        </section>

        {/* Section: Documentos */}
        <section className="space-y-4">
          <SectionHeader icon={Paperclip} title="Documentos" />

          {selectedDocuments.length > 0 && (
            <div className="space-y-1">
              {selectedDocuments.map((docId) => {
                const doc = allDocs.find((d: any) => d.id === docId);
                return (
                  <div
                    key={docId}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{doc?.title || doc?.fileName || docId}</span>
                    </div>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setSelectedDocuments((prev) => prev.filter((x) => x !== docId))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowDocDialog(true)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              A&ntilde;adir documento
            </button>
            <span className="text-muted-foreground/40">|</span>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Subir nuevo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const title = file.name.replace(/\.[^.]+$/, "");
                const fd = new FormData();
                fd.append("file", file);
                fd.append("title", title);
                fd.append("sessionType", "OTHER");
                try {
                  const doc: any = await uploadDocument.mutateAsync(fd);
                  setSelectedDocuments((prev) => [...prev, doc.id]);
                  toast.success("Documento subido");
                } catch {
                  toast.error("Error al subir el documento");
                }
                e.target.value = "";
              }}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            className="px-6"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="px-8"
          >
            {loading ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar actividad"}
          </Button>
        </div>
      </form>

      {/* Add Participant Dialog */}
      <AddParticipantDialog
        open={showParticipantDialog}
        onClose={() => setShowParticipantDialog(false)}
        existingIds={participants.map((p) => `${p.kind}-${p.id}`)}
        members={members}
        contacts={allContacts}
        onAdd={(p) => setParticipants((prev) => [...prev, p])}
      />

      {/* Attach Document Dialog */}
      <AttachDocDialog
        open={showDocDialog}
        onClose={() => setShowDocDialog(false)}
        existingDocIds={selectedDocuments}
        allDocs={allDocs}
        onAttach={(docId) => setSelectedDocuments((prev) => [...prev, docId])}
        onUpload={async (file) => {
          const title = file.name.replace(/\.[^.]+$/, "");
          const fd = new FormData();
          fd.append("file", file);
          fd.append("title", title);
          fd.append("sessionType", "OTHER");
          try {
            const doc: any = await uploadDocument.mutateAsync(fd);
            setSelectedDocuments((prev) => [...prev, doc.id]);
            toast.success("Documento subido y adjuntado");
          } catch {
            toast.error("Error al subir el documento");
          }
        }}
      />
    </div>
  );
}

/* ─── Add Participant Dialog ─── */

function AddParticipantDialog({
  open,
  onClose,
  existingIds,
  members,
  contacts,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  existingIds: string[];
  members: any[];
  contacts: any[];
  onAdd: (p: Participant) => void;
}) {
  const [tab, setTab] = useState<"members" | "contacts">("members");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");

  const filteredMembers = members.filter(
    (m: any) =>
      !existingIds.includes(`member-${m.id}`) &&
      (m.name.toLowerCase().includes(search.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(search.toLowerCase())))
  );

  const filteredContacts = contacts.filter(
    (c: any) =>
      !existingIds.includes(`contact-${c.id}`) &&
      (c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase())))
  );

  function handleSelect(item: any) {
    if (tab === "members") {
      onAdd({ id: item.id, name: item.name, kind: "member", email: item.email });
    } else {
      onAdd({ id: item.id, name: item.name, kind: "contact", role: role.trim(), category: item.category });
      setRole("");
    }
    setSearch("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(""); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>A&ntilde;adir participante</DialogTitle>
        </DialogHeader>

        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button
            type="button"
            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
              tab === "members"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab("members"); setSearch(""); }}
          >
            Miembros
          </button>
          <button
            type="button"
            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
              tab === "contacts"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => { setTab("contacts"); setSearch(""); }}
          >
            Contactos externos
          </button>
        </div>

        <Input
          placeholder={tab === "members" ? "Buscar miembro..." : "Buscar contacto..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />

        {tab === "contacts" && (
          <Input
            placeholder="Rol: ponente, organizador... (opcional)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        )}

        <div className="max-h-60 overflow-y-auto -mx-1 px-1">
          {tab === "members" ? (
            filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay miembros disponibles</p>
            ) : (
              <div className="space-y-0.5">
                {filteredMembers.map((m: any) => (
                  <button
                    key={m.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                    onClick={() => handleSelect(m)}
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 text-blue-700 text-xs font-medium shrink-0 dark:bg-blue-900 dark:text-blue-200">
                      {m.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : (
            filteredContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No hay contactos disponibles</p>
            ) : (
              <div className="space-y-0.5">
                {filteredContacts.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                    onClick={() => handleSelect(c)}
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-100 text-orange-700 text-xs font-medium shrink-0 dark:bg-orange-900 dark:text-orange-200">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <div className="flex items-center gap-2">
                        {c.category && <span className="text-xs text-muted-foreground">{c.category}</span>}
                        {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Attach Document Dialog ─── */

function AttachDocDialog({
  open,
  onClose,
  existingDocIds,
  allDocs,
  onAttach,
  onUpload,
}: {
  open: boolean;
  onClose: () => void;
  existingDocIds: string[];
  allDocs: any[];
  onAttach: (docId: string) => void;
  onUpload: (file: File) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"existing" | "upload">("existing");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = allDocs.filter(
    (d: any) =>
      !existingDocIds.includes(d.id) &&
      (d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.fileName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setSearch(""); setTab("existing"); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjuntar documento</DialogTitle>
        </DialogHeader>

        <div className="flex rounded-lg border p-0.5 bg-muted/50">
          <button
            type="button"
            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
              tab === "existing"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("existing")}
          >
            Existente
          </button>
          <button
            type="button"
            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${
              tab === "upload"
                ? "bg-background shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("upload")}
          >
            Subir nuevo
          </button>
        </div>

        {tab === "existing" ? (
          <>
            <Input
              placeholder="Buscar documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-60 overflow-y-auto -mx-1 px-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No hay documentos disponibles</p>
              ) : (
                <div className="space-y-0.5">
                  {filtered.map((doc: any) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-left transition-colors"
                      onClick={() => { onAttach(doc.id); onClose(); }}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border py-10 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-sm font-medium">Haz clic para seleccionar un archivo</p>
              <p className="text-xs text-muted-foreground mt-1">o arrastra y suelta aqu&iacute;</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onUpload(file);
                  onClose();
                }
                e.target.value = "";
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
