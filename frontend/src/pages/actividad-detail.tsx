import { useState, useRef } from "react";
import { useParams, Link } from "react-router";
import {
  Pencil, CalendarDays, MapPin, Users, Building, UserPlus, UserMinus,
  Paperclip, FileText, Download, X, Upload, Plus, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  useActivity, useAttendActivity, useUnattendActivity,
  useDocuments, useUploadDocument, useProcessDocument, useAttachDocument, useDetachDocument,
  useAlbums, useAttachAlbum, useDetachAlbum,
} from "@/api/hooks";
import { formatDateTime } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function ActividadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const { data: activity, isLoading } = useActivity(id!);
  const attend = useAttendActivity(id!);
  const unattend = useUnattendActivity(id!);
  const attachDoc = useAttachDocument(id!);
  const detachDoc = useDetachDocument(id!);
  const uploadDocument = useUploadDocument();
  const processDocument = useProcessDocument();

  const [showAttachDialog, setShowAttachDialog] = useState(false);
  const [showAttachAlbumDialog, setShowAttachAlbumDialog] = useState(false);
  const attachAlbum = useAttachAlbum(id!);
  const detachAlbum = useDetachAlbum(id!);

  if (isLoading || !activity) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Actividad no encontrada"}
        </h1>
      </div>
    );
  }

  const canEdit = isAdmin || activity.createdById === user?.id;
  const isAttending = activity.attendees?.some(
    (a: any) => a.user.id === user?.id
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold">{activity.title}</h1>
            <Badge variant="secondary">
              {ACTIVITY_TYPE_LABELS[activity.type]}
            </Badge>
            <Badge
              variant="outline"
              className={
                activity.status === "DONE"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : activity.status === "IN_PROGRESS"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-yellow-100 text-yellow-800 border-yellow-200"
              }
            >
              {ACTIVITY_STATUS_LABELS[activity.status] || "Por Hacer"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Creado por {activity.createdBy?.name}
          </p>
        </div>
        {canEdit && (
          <Link to={`/actividades/${activity.id}/editar`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Detalles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Creado por:</span>
                <span className="font-medium">{activity.user?.name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Fecha:</span>
                <span>{formatDateTime(activity.date)}</span>
              </div>

              {activity.dueDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Fecha límite:</span>
                  <span>{formatDateTime(activity.dueDate)}</span>
                </div>
              )}

              {activity.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Lugar:</span>
                  <span>{activity.location}</span>
                </div>
              )}

              {activity.associationsInvolved && (
                <div className="flex items-center gap-2 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Entidades:</span>
                  <span>{activity.associationsInvolved}</span>
                </div>
              )}
            </div>

            {activity.tags && activity.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {activity.tags.map(({ tag }: any) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    style={
                      tag.color
                        ? { borderColor: tag.color, color: tag.color }
                        : undefined
                    }
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendees */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Participantes</CardTitle>
            {user && (
              isAttending ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unattend.isPending}
                  onClick={() =>
                    unattend.mutate(undefined, {
                      onSuccess: () => toast.success("Te has desapuntado"),
                      onError: () => toast.error("Error al desapuntarse"),
                    })
                  }
                >
                  <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                  Desapuntarme
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={attend.isPending}
                  onClick={() =>
                    attend.mutate(undefined, {
                      onSuccess: () => toast.success("Te has apuntado"),
                      onError: (err: any) =>
                        toast.error(err?.message || "Error al apuntarse"),
                    })
                  }
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Apuntarme
                </Button>
              )
            )}
          </CardHeader>
          <CardContent>
            {!activity.attendees || activity.attendees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin participantes registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {activity.attendees.map(({ user: attendee }: any) => (
                  <Link
                    key={attendee.id}
                    to={`/miembros/${attendee.id}`}
                    className="block p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{attendee.name}</p>
                    {attendee.position && (
                      <p className="text-xs text-muted-foreground">
                        {attendee.position}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            <Paperclip className="inline h-4 w-4 mr-1.5" />
            Documentos adjuntos
          </CardTitle>
          {user && (
            <Button size="sm" variant="outline" onClick={() => setShowAttachDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Adjuntar
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!activity.documents || activity.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin documentos adjuntos.</p>
          ) : (
            <div className="space-y-2">
              {activity.documents.map(({ document: doc }: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 rounded-md border"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <Link
                        to={`/documentos/${doc.id}`}
                        className="text-sm font-medium hover:underline truncate block"
                      >
                        {doc.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {doc.fileName}
                        {doc.fileSize ? ` · ${formatFileSize(doc.fileSize)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`}/documents/${doc.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    {(isAdmin || activity.createdById === user?.id) && (
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
          <CardTitle className="text-base">
            <ImageIcon className="inline h-4 w-4 mr-1.5" />
            Álbumes vinculados
          </CardTitle>
          {user && (
            <Button size="sm" variant="outline" onClick={() => setShowAttachAlbumDialog(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Vincular
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!activity.albums || activity.albums.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin álbumes vinculados.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {activity.albums.map(({ album: alb }: any) => (
                <div key={alb.id} className="relative group">
                  <Link to={`/galeria/${alb.id}`}>
                    <div className="aspect-[4/3] bg-muted rounded-md overflow-hidden">
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
                    <p className="text-xs font-medium mt-1 truncate">{alb.title}</p>
                    <p className="text-[10px] text-muted-foreground">{alb._count?.photos || 0} fotos</p>
                  </Link>
                  {(isAdmin || activity.createdById === user?.id) && (
                    <button
                      type="button"
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      onClick={() =>
                        detachAlbum.mutate(alb.id, {
                          onSuccess: () => toast.success("Álbum desvinculado"),
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

      {/* Attach Album Dialog */}
      <AttachAlbumDialog
        open={showAttachAlbumDialog}
        onClose={() => setShowAttachAlbumDialog(false)}
        existingAlbumIds={(activity.albums || []).map((a: any) => a.album.id)}
        onAttach={(albumId) =>
          attachAlbum.mutate(albumId, {
            onSuccess: () => toast.success("Álbum vinculado"),
            onError: (err: any) => toast.error(err?.message || "Error al vincular"),
          })
        }
      />

      {/* Notes / Acta - full width */}
      {activity.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas / Acta</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="prose-notes"
              dangerouslySetInnerHTML={{ __html: activity.notes }}
            />
          </CardContent>
        </Card>
      )}

      {/* Attach Document Dialog */}
      <AttachDocumentDialog
        open={showAttachDialog}
        onClose={() => setShowAttachDialog(false)}
        activityId={id!}
        existingDocIds={
          (activity.documents || []).map((d: any) => d.document.id)
        }
        onAttach={(docId) =>
          attachDoc.mutate(docId, {
            onSuccess: () => toast.success("Documento adjuntado"),
            onError: (err: any) => toast.error(err?.message || "Error al adjuntar"),
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
            // Process in background (extract text + embeddings)
            processDocument.mutate(doc.id);
          } catch {
            toast.error("Error al subir el documento");
          }
        }}
      />
    </div>
  );
}

function AttachDocumentDialog({
  open,
  onClose,
  activityId,
  existingDocIds,
  onAttach,
  onUploadAndAttach,
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

  function handleAttach(docId: string) {
    onAttach(docId);
    onClose();
  }

  function handleUpload() {
    if (!selectedFile || !uploadTitle.trim()) return;
    onUploadAndAttach(selectedFile, uploadTitle.trim());
    setSelectedFile(null);
    setUploadTitle("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adjuntar documento</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <button
            type="button"
            className={`text-sm px-3 py-1 rounded-md transition-colors ${
              tab === "existing"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setTab("existing")}
          >
            Existente
          </button>
          <button
            type="button"
            className={`text-sm px-3 py-1 rounded-md transition-colors ${
              tab === "upload"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setTab("upload")}
          >
            <Upload className="inline h-3.5 w-3.5 mr-1" />
            Subir nuevo
          </button>
        </div>

        {tab === "existing" ? (
          <div className="space-y-3">
            <Input
              placeholder="Buscar documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {filteredDocs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No hay documentos disponibles
                </p>
              ) : (
                filteredDocs.map((doc: any) => (
                  <button
                    key={doc.id}
                    type="button"
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted text-left transition-colors"
                    onClick={() => handleAttach(doc.id)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.fileName}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Título del documento *</Label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Título del documento"
              />
            </div>
            <div className="space-y-2">
              <Label>Archivo *</Label>
              <input
                ref={fileRef}
                type="file"
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSelectedFile(f);
                    if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, ""));
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={!selectedFile || !uploadTitle.trim()}
                onClick={handleUpload}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Subir y adjuntar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AttachAlbumDialog({
  open,
  onClose,
  existingAlbumIds,
  onAttach,
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
    (a: any) =>
      !existingAlbumIds.includes(a.id) &&
      a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular álbum</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Buscar álbum..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="max-h-60 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay álbumes disponibles
            </p>
          ) : (
            filtered.map((album: any) => (
              <button
                key={album.id}
                type="button"
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                onClick={() => {
                  onAttach(album.id);
                  onClose();
                }}
              >
                <div className="w-10 h-10 bg-muted rounded overflow-hidden shrink-0">
                  {album.coverPhoto?.id ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4000/api`}/photos/${album.coverPhoto.id}/thumbnail?token=${localStorage.getItem("token")}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{album.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {album._count?.photos || 0} fotos
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
