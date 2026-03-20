import { useState, useRef } from "react";
import { useParams, Link } from "react-router";
import {
  Pencil, CalendarDays, MapPin, Users, UserPlus, UserMinus,
  Paperclip, FileText, Download, X, Upload, Plus, ImageIcon, Bot, Loader2,
  Phone, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  useActivity, useAttendActivity, useUnattendActivity,
  useDocuments, useUploadDocument, useAttachDocument, useDetachDocument,
  useAlbums, useAttachAlbum, useDetachAlbum,
  useContacts, useAttachContact, useDetachContact,
  useMembers, useAddAttendee, useRemoveAttendee,
  useAISummarize,
} from "@/api/hooks";
import { formatDateTime, formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

function colorForName(name: string) {
  let hash = 0;
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}


export function ActividadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { data: activity, isLoading } = useActivity(id!);
  const attend = useAttendActivity(id!);
  const unattend = useUnattendActivity(id!);
  const attachDoc = useAttachDocument(id!);
  const detachDoc = useDetachDocument(id!);
  const uploadDocument = useUploadDocument();

  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [showAttachAlbumDialog, setShowAttachAlbumDialog] = useState(false);
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const attachAlbum = useAttachAlbum(id!);
  const attachContact = useAttachContact(id!);
  const detachContact = useDetachContact(id!);
  const detachAlbum = useDetachAlbum(id!);
  const addAttendee = useAddAttendee(id!);
  const removeAttendee = useRemoveAttendee(id!);
  const summarize = useAISummarize();
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  if (isLoading || !activity) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Evento no encontrado"}
        </h1>
      </div>
    );
  }

  const canEdit = isAdmin || activity.createdById === user?.id;
  const isAttending = activity.attendees?.some((a: any) => a.id === user?.id);

  return (
    <div className="space-y-6">
      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{activity.title}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Badge>
            <StatusBadge status={activity.status} />
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDateTime(activity.startDate)}
            </span>
            {activity.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {activity.location}
              </span>
            )}
            <span>Responsable: {activity.ownerName}</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={summarize.isPending}
            onClick={() =>
              summarize.mutate(id!, {
                onSuccess: (data) => setAiSummary(data.summary),
                onError: () => toast.error("Error al generar resumen"),
              })
            }
          >
            {summarize.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Bot className="mr-1.5 h-4 w-4" />
            )}
            Resumir con IA
          </Button>
          {canEdit && (
            <Link to={`/actividades/${activity.id}/editar`}>
              <Button size="sm">
                <Pencil className="mr-1.5 h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Resumen IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* ── TWO-COLUMN LAYOUT ── */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-6 order-2 lg:order-1">

          {/* Notas / Acta */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notas / Acta</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.description ? (
                <div
                  className="prose-notes text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activity.description }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Sin notas.</p>
              )}
            </CardContent>
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Documentos</CardTitle>
              {user && (
                <Button size="sm" variant="ghost" className="text-primary" onClick={() => setShowAttachDialog(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Anadir documento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!activity.documents || activity.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p>
              ) : (
                <div className="space-y-1">
                  {activity.documents.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <Link
                            to={`/documentos/${doc.id}`}
                            className="text-sm font-medium hover:underline truncate block"
                          >
                            {doc.title || doc.fileName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {doc.fileSize ? formatFileSize(doc.fileSize) : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`}/documents/${doc.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() =>
                              detachDoc.mutate(doc.id, {
                                onSuccess: () => toast.success("Documento desvinculado"),
                                onError: () => toast.error("Error al desvincular"),
                              })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Albums */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Albums</CardTitle>
              {user && (
                <Button size="sm" variant="ghost" className="text-primary" onClick={() => setShowAttachAlbumDialog(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Vincular album
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {!activity.albums || activity.albums.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay albums vinculados.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {activity.albums.map((alb: any) => (
                    <div key={alb.id} className="relative group">
                      <Link to={`/galeria/${alb.id}`}>
                        <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden hover:shadow-sm transition-all">
                          {alb.coverPhoto?.id ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`}/photos/${alb.coverPhoto.id}/thumbnail?token=${localStorage.getItem("token")}`}
                              alt={alb.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs font-medium mt-1.5 truncate">{alb.title}</p>
                        <p className="text-[10px] text-muted-foreground">{alb.photoCount || 0} fotos</p>
                      </Link>
                      {canEdit && (
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          onClick={() =>
                            detachAlbum.mutate(alb.id, {
                              onSuccess: () => toast.success("Album desvinculado"),
                              onError: () => toast.error("Error al desvincular"),
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-6 order-1 lg:order-2">

          {/* Detalles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Responsable
                </p>
                <p className="text-sm font-medium">{activity.ownerName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> Fecha
                </p>
                <p className="text-sm font-medium">{formatDateTime(activity.startDate)}</p>
              </div>
              {activity.location && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Lugar
                  </p>
                  <p className="text-sm font-medium">{activity.location}</p>
                </div>
              )}
              {activity.tags && activity.tags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {activity.tags.map((tag: any) => (
                    <Badge
                      key={tag.id}
                      variant="outline"
                      className="text-[10px]"
                      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Participantes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Participantes</CardTitle>
              <div className="flex gap-1">
                {user && (
                  isAttending ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={unattend.isPending}
                      onClick={() =>
                        unattend.mutate(undefined, {
                          onSuccess: () => toast.success("Te has desapuntado"),
                          onError: () => toast.error("Error"),
                        })
                      }
                    >
                      <UserMinus className="mr-1 h-3 w-3" />
                      Salir
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7 text-xs"
                      disabled={attend.isPending}
                      onClick={() =>
                        attend.mutate(undefined, {
                          onSuccess: () => toast.success("Te has apuntado"),
                          onError: (err: any) => toast.error(err?.message || "Error"),
                        })
                      }
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      Unirme
                    </Button>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {((!activity.attendees || activity.attendees.length === 0) &&
                (!activity.contacts || activity.contacts.length === 0)) ? (
                <p className="text-sm text-muted-foreground">Sin participantes.</p>
              ) : (
                <>
                  {(activity.attendees || []).map((attendee: any) => (
                    <div
                      key={`m-${attendee.id}`}
                      className="flex items-center justify-between py-1.5 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`${colorForName(attendee.name)} h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
                          {getInitials(attendee.name)}
                        </div>
                        <span className="text-sm truncate">{attendee.name}</span>
                      </div>
                      {canEdit && attendee.id !== activity.ownerId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() =>
                            removeAttendee.mutate(attendee.id, {
                              onSuccess: () => toast.success("Eliminado"),
                              onError: () => toast.error("Error"),
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {(activity.contacts || []).map((c: any) => (
                    <div
                      key={`c-${c.id}`}
                      className="flex items-center justify-between py-1.5 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="bg-orange-500 h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/contactos/${c.id}`} className="text-sm hover:underline truncate block">
                            {c.name}
                          </Link>
                          {c.role && <span className="text-[10px] text-muted-foreground">{c.role}</span>}
                        </div>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() =>
                            detachContact.mutate(c.id, {
                              onSuccess: () => toast.success("Desvinculado"),
                              onError: () => toast.error("Error"),
                            })
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-primary mt-2 h-8 text-xs"
                  onClick={() => setShowAddParticipantDialog(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Anadir participante
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Actividad (timeline) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              {activity.timeline && activity.timeline.length > 0 ? (
                <div className="space-y-3">
                  {activity.timeline.map((event: any) => (
                    <div key={event.id} className="flex gap-3 text-sm">
                      <div className="shrink-0 mt-0.5">
                        <div className="h-2 w-2 rounded-full bg-primary/60 mt-1.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{event.detail || event.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.userName} &middot; {formatDateTime(event.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-3 text-sm">
                    <div className="shrink-0 mt-0.5">
                      <div className="h-2 w-2 rounded-full bg-primary/60 mt-1.5" />
                    </div>
                    <div>
                      <p className="text-sm">{activity.createdByName} creo el evento</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── DIALOGS ── */}
      <AddParticipantDialog
        open={showAddParticipantDialog}
        onClose={() => setShowAddParticipantDialog(false)}
        existingAttendeeIds={(activity.attendees || []).map((a: any) => a.id)}
        existingContactIds={(activity.contacts || []).map((c: any) => c.id)}
        onAddMember={(userId) =>
          addAttendee.mutate(userId, {
            onSuccess: () => toast.success("Miembro anadido"),
            onError: (err: any) => toast.error(err?.message || "Error"),
          })
        }
        onAddContact={(contactId, role) =>
          attachContact.mutate({ contactId, role }, {
            onSuccess: () => toast.success("Contacto vinculado"),
            onError: (err: any) => toast.error(err?.message || "Error"),
          })
        }
      />

      <AttachAlbumDialog
        open={showAttachAlbumDialog}
        onClose={() => setShowAttachAlbumDialog(false)}
        existingAlbumIds={(activity.albums || []).map((a: any) => a.id)}
        onAttach={(albumId) =>
          attachAlbum.mutate(albumId, {
            onSuccess: () => toast.success("Album vinculado"),
            onError: (err: any) => toast.error(err?.message || "Error"),
          })
        }
      />

      <AttachDocumentDialog
        open={showAttachDialog}
        onClose={() => setShowAttachDialog(false)}
        activityId={id!}
        existingDocIds={(activity.documents || []).map((d: any) => d.id)}
        onAttach={(docId) =>
          attachDoc.mutate(docId, {
            onSuccess: () => toast.success("Documento adjuntado"),
            onError: (err: any) => toast.error(err?.message || "Error"),
          })
        }
        onUploadAndAttach={async (file, title) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("title", title);
          formData.append("sessionType", "OTHER");
          try {
            const doc: any = await uploadDocument.mutateAsync(formData);
            attachDoc.mutate(doc.id, {
              onSuccess: () => toast.success("Documento subido y adjuntado"),
            });
          } catch {
            toast.error("Error al subir el documento");
          }
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   DIALOGS (unchanged logic, kept at bottom)
   ───────────────────────────────────────────── */

function AttachDocumentDialog({
  open, onClose, activityId, existingDocIds, onAttach, onUploadAndAttach,
}: {
  open: boolean;
  onClose: () => void;
  activityId: string;
  existingDocIds: string[];
  onAttach: (docId: string) => void;
  onUploadAndAttach: (file: File, title: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"existing" | "upload">("existing");
  const [uploadTitle, setUploadTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: docsData } = useDocuments({ limit: "100" });
  const allDocs = docsData?.documents || [];
  const filteredDocs = allDocs.filter(
    (d: any) =>
      !existingDocIds.includes(d.id) &&
      (d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.fileName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjuntar documento</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 border-b pb-2">
          <button type="button" className={`text-sm px-3 py-1 rounded-md transition-colors ${tab === "existing" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setTab("existing")}>Existente</button>
          <button type="button" className={`text-sm px-3 py-1 rounded-md transition-colors ${tab === "upload" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => setTab("upload")}><Upload className="inline h-3.5 w-3.5 mr-1" />Subir nuevo</button>
        </div>
        {tab === "existing" ? (
          <div className="space-y-3">
            <Input placeholder="Buscar documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No hay documentos disponibles</p>
              ) : filteredDocs.map((doc: any) => (
                <button key={doc.id} type="button" className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors" onClick={() => { onAttach(doc.id); onClose(); }}>
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Titulo del documento *</Label>
              <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Titulo del documento" />
            </div>
            <div className="space-y-2">
              <Label>Archivo *</Label>
              <input ref={fileRef} type="file" className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setSelectedFile(f); if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, "")); }}} />
            </div>
            <DialogFooter>
              <Button disabled={!selectedFile || !uploadTitle.trim()} onClick={() => { if (!selectedFile || !uploadTitle.trim()) return; onUploadAndAttach(selectedFile, uploadTitle.trim()); setSelectedFile(null); setUploadTitle(""); onClose(); }}>
                <Upload className="mr-1.5 h-4 w-4" />Subir y adjuntar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachAlbumDialog({
  open, onClose, existingAlbumIds, onAttach,
}: {
  open: boolean;
  onClose: () => void;
  existingAlbumIds: string[];
  onAttach: (albumId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: albumsData } = useAlbums({ limit: "100" });
  const allAlbums = albumsData?.albums || [];
  const filtered = allAlbums.filter(
    (a: any) => !existingAlbumIds.includes(a.id) && a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular album</DialogTitle>
        </DialogHeader>
        <Input placeholder="Buscar album..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay albums disponibles</p>
          ) : filtered.map((album: any) => (
            <button key={album.id} type="button" className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors" onClick={() => { onAttach(album.id); onClose(); }}>
              <div className="w-10 h-10 bg-muted rounded overflow-hidden shrink-0">
                {album.coverPhoto?.id ? (
                  <img src={`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`}/photos/${album.coverPhoto.id}/thumbnail?token=${localStorage.getItem("token")}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground/30" /></div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{album.title}</p>
                <p className="text-xs text-muted-foreground">{album._count?.photos || album.photoCount || 0} fotos</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddParticipantDialog({
  open, onClose, existingAttendeeIds, existingContactIds, onAddMember, onAddContact,
}: {
  open: boolean;
  onClose: () => void;
  existingAttendeeIds: string[];
  existingContactIds: string[];
  onAddMember: (userId: string) => void;
  onAddContact: (contactId: string, role?: string) => void;
}) {
  const [tab, setTab] = useState<"members" | "contacts">("members");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const { data: membersData } = useMembers({ active: "true", limit: "100" });
  const { data: contactsData } = useContacts({ limit: "200" });
  const allMembers = membersData?.members || [];
  const allContacts = contactsData?.contacts || [];

  const filteredMembers = allMembers.filter(
    (m: any) => !existingAttendeeIds.includes(m.id) && (m.name.toLowerCase().includes(search.toLowerCase()) || (m.email && m.email.toLowerCase().includes(search.toLowerCase())))
  );
  const filteredContacts = allContacts.filter(
    (c: any) => !existingContactIds.includes(c.id) && (c.name.toLowerCase().includes(search.toLowerCase()) || (c.email && c.email.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Anadir participante</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 border-b pb-2">
          <button type="button" className={`text-sm px-3 py-1 rounded-md transition-colors ${tab === "members" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => { setTab("members"); setSearch(""); }}>
            <Users className="inline h-3.5 w-3.5 mr-1" />Miembros
          </button>
          <button type="button" className={`text-sm px-3 py-1 rounded-md transition-colors ${tab === "contacts" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`} onClick={() => { setTab("contacts"); setSearch(""); }}>
            Contactos externos
          </button>
        </div>
        <Input placeholder={tab === "members" ? "Buscar miembro..." : "Buscar contacto..."} value={search} onChange={(e) => setSearch(e.target.value)} />
        {tab === "contacts" && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rol en este evento (opcional)</Label>
            <Input placeholder="Ej: ponente, organizador, proveedor..." value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        )}
        <div className="max-h-60 overflow-y-auto space-y-1">
          {tab === "members" ? (
            filteredMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No hay miembros disponibles</p>
            ) : filteredMembers.map((member: any) => (
              <button key={member.id} type="button" className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors" onClick={() => { onAddMember(member.id); onClose(); }}>
                <div className={`${colorForName(member.name)} h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{member.name}</p>
                  {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                </div>
              </button>
            ))
          ) : (
            filteredContacts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No hay contactos disponibles</p>
                <Link to="/contactos/nuevo" className="text-sm text-primary hover:underline mt-1 inline-block">Crear nuevo contacto</Link>
              </div>
            ) : filteredContacts.map((contact: any) => (
              <button key={contact.id} type="button" className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors" onClick={() => { onAddContact(contact.id, role.trim() || undefined); setRole(""); onClose(); }}>
                <div className="bg-orange-500 h-7 w-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                  {getInitials(contact.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <div className="flex items-center gap-2">
                    {contact.category && <span className="text-xs text-muted-foreground">{contact.category}</span>}
                    {contact.email && <span className="text-xs text-muted-foreground">{contact.email}</span>}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

