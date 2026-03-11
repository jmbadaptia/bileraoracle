import { useParams, useNavigate } from "react-router";
import {
  Download,
  FileText,
  User,
  Calendar,
  HardDrive,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useDocument, useDeleteDocument } from "@/api/hooks";
import { api } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  DOCUMENT_STATUS_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: document, isLoading } = useDocument(id!);
  const deleteDocument = useDeleteDocument();

  if (isLoading || !document) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Documento no encontrado"}
        </h1>
      </div>
    );
  }

  const downloadUrl = api.streamUrl(`/documents/${document.id}/download`);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-muted shrink-0">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words">{document.title}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {document.fileName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none"
          >
            <Button className="w-full sm:w-auto">
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          </a>
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="flex-1 sm:flex-none"
                  disabled={deleteDocument.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Se eliminará permanentemente el documento
                    &ldquo;{document.title}&rdquo; y todos sus datos asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={() => {
                      deleteDocument.mutate(document.id, {
                        onSuccess: () => {
                          toast.success("Documento eliminado");
                          navigate("/documentos");
                        },
                        onError: () => toast.error("Error al eliminar"),
                      });
                    }}
                  >
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Informacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {document.description && (
              <div>
                <h4 className="text-sm font-medium mb-1">Descripcion</h4>
                <p className="text-sm whitespace-pre-wrap">
                  {document.description}
                </p>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Subido:</span>
                <span>{formatDateTime(document.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Por:</span>
                <span>{document.uploaderName}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tamano:</span>
                <span>{formatFileSize(document.fileSize)}</span>
              </div>
            </div>

            {document.tags && document.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {document.tags.map(({ tag }: any) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Procesamiento</span>
              <Badge
                variant={
                  document.status === "READY"
                    ? "default"
                    : document.status === "ERROR"
                      ? "destructive"
                      : "secondary"
                }
              >
                {DOCUMENT_STATUS_LABELS[document.status]}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
