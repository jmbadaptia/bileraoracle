import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { FileText, X, Upload, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  useActivity,
  useMembers,
  useDocuments,
  useUploadDocument,
  useCreateActivity,
  useUpdateActivity,
} from "@/api/hooks";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TiptapEditor } from "@/components/tiptap-editor";

function nowLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function ActividadFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;

  const { data: activity, isLoading: loadingActivity } = useActivity(id || "");
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const { data: docsData } = useDocuments({ limit: "200" });
  const uploadDocument = useUploadDocument();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity(id || "");

  const members = membersData?.members || [];
  const allDocs = docsData?.documents || [];

  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(
    activity?.type || "MEETING"
  );
  const [selectedStatus, setSelectedStatus] = useState(
    activity?.status || "PENDING"
  );
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [notesContent, setNotesContent] = useState(activity?.description || "");
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [docSearch, setDocSearch] = useState("");
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [synced, setSynced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when activity loads (edit mode)
  if (isEdit && activity && !synced) {
    setSelectedType(activity.type);
    setSelectedStatus(activity.status || "PENDING");
    setNotesContent(activity.description || "");
    // In edit mode, collect all participants (owner + attendees)
    const participantIds = new Set<string>();
    if (activity.ownerId) participantIds.add(activity.ownerId);
    if (activity.attendees) {
      for (const a of activity.attendees) participantIds.add(a.id);
    }
    setSelectedParticipants(Array.from(participantIds));
    if (activity.documents) {
      setSelectedDocuments(activity.documents.map((d: any) => d.id || d.documentId));
    }
    setSynced(true);
  }

  // Auto-select current user for new activities
  if (!isEdit && !synced && user?.id && members.length > 0) {
    setSelectedParticipants([user.id]);
    setSynced(true);
  }

  if (isEdit && loadingActivity) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Cargando...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    // ownerId = creator (current user for new, keep original for edit)
    const ownerId = isEdit ? activity?.ownerId || user!.id : user!.id;

    // attendeeIds = all selected participants
    const attendeeIds = selectedParticipants.length > 0 ? selectedParticipants : undefined;

    const data = {
      ownerId,
      type: selectedType,
      status: selectedStatus,
      title: formData.get("title") as string,
      startDate: (formData.get("startDate") as string) || undefined,
      location: (formData.get("location") as string) || undefined,
      description: notesContent || undefined,
      attendeeIds,
      documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
    };

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

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-2">
          <input
            id="title"
            name="title"
            form="activity-form"
            required
            defaultValue={activity?.title}
            placeholder={isEdit ? "Título de la actividad" : "Nueva actividad..."}
            className="w-full text-2xl font-bold tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/50"
          />
        </CardHeader>
        <CardContent>
          <form id="activity-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Línea 1: Lugar, Tipo, Estado */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="location">Lugar</Label>
                <Input
                  id="location"
                  name="location"
                  defaultValue={activity?.location || ""}
                  placeholder="Ubicación"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_STATUS_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Línea 2: Fecha inicio */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="datetime-local"
                  defaultValue={
                    activity?.startDate
                      ? new Date(activity.startDate).toISOString().slice(0, 16)
                      : !isEdit
                        ? nowLocal()
                        : ""
                  }
                />
              </div>
            </div>

            {/* Línea 4: Participantes */}
            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No hay miembros disponibles
                  </p>
                ) : (
                  members.map((member: any) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 text-sm cursor-pointer py-0.5"
                    >
                      <Checkbox
                        checked={selectedParticipants.includes(member.id)}
                        onCheckedChange={(checked) => {
                          setSelectedParticipants((prev) =>
                            checked
                              ? [...prev, member.id]
                              : prev.filter((id) => id !== member.id)
                          );
                        }}
                      />
                      <span>{member.name}</span>
                      {member.email && (
                        <span className="text-muted-foreground">
                          ({member.email})
                        </span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Línea 5: Documentos */}
            <div className="space-y-2">
              <Label>Documentos adjuntos</Label>
              {/* Selected docs */}
              {selectedDocuments.length > 0 && (
                <div className="space-y-1">
                  {selectedDocuments.map((docId) => {
                    const doc = allDocs.find((d: any) => d.id === docId);
                    return (
                      <div
                        key={docId}
                        className="flex items-center justify-between p-2 rounded-md border text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {doc?.title || docId}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setSelectedDocuments((prev) =>
                              prev.filter((id) => id !== docId)
                            )
                          }
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDocPicker(!showDocPicker)}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Adjuntar existente
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Subir nuevo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const title = file.name.replace(/\.[^.]+$/, "");
                    const formData = new FormData();
                    formData.append("file", file);
                    formData.append("title", title);
                    formData.append("sessionType", "OTHER");
                    try {
                      const doc: any = await uploadDocument.mutateAsync(formData);
                      setSelectedDocuments((prev) => [...prev, doc.id]);
                      toast.success("Documento subido");
                    } catch {
                      toast.error("Error al subir el documento");
                    }
                    e.target.value = "";
                  }}
                />
              </div>
              {/* Doc picker */}
              {showDocPicker && (
                <div className="border rounded-md p-2 space-y-2">
                  <Input
                    placeholder="Buscar documento..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                  <div className="max-h-40 overflow-y-auto space-y-0.5">
                    {allDocs
                      .filter(
                        (d: any) =>
                          !selectedDocuments.includes(d.id) &&
                          (d.title
                            .toLowerCase()
                            .includes(docSearch.toLowerCase()) ||
                            d.fileName
                              .toLowerCase()
                              .includes(docSearch.toLowerCase()))
                      )
                      .map((doc: any) => (
                        <button
                          key={doc.id}
                          type="button"
                          className="w-full flex items-center gap-2 p-1.5 rounded hover:bg-muted text-left text-sm"
                          onClick={() => {
                            setSelectedDocuments((prev) => [...prev, doc.id]);
                            setShowDocPicker(false);
                            setDocSearch("");
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{doc.title}</span>
                          <span className="text-xs text-muted-foreground truncate ml-auto">
                            {doc.fileName}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Línea 6: Descripción */}
            <div className="space-y-2">
              <Label>Descripción / Notas</Label>
              <TiptapEditor
                content={notesContent}
                onChange={setNotesContent}
                placeholder="Escribe el acta de la reunión, notas u observaciones..."
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
