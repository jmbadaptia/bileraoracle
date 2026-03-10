import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { FileText, Upload, ClipboardList, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SharedFileInfo {
  file: File;
  name: string;
  size: number;
  type: string;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SHARE_CACHE = "share-target-files";

export function CompartirPage() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<SharedFileInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSharedFiles();
  }, []);

  async function loadSharedFiles() {
    try {
      const cache = await caches.open(SHARE_CACHE);

      // Read metadata to know how many files
      const metaResponse = await cache.match(new Request("/_share/metadata"));
      if (!metaResponse) {
        setLoading(false);
        return;
      }

      const metadata = await metaResponse.json();
      const sharedFiles: SharedFileInfo[] = [];

      for (let i = 0; i < metadata.fileCount; i++) {
        const fileResponse = await cache.match(
          new Request(`/_share/file/${i}`)
        );
        if (!fileResponse) continue;

        const blob = await fileResponse.blob();
        const name = decodeURIComponent(
          fileResponse.headers.get("X-File-Name") || `archivo-${i}`
        );
        const size = Number(fileResponse.headers.get("X-File-Size") || blob.size);
        const type = fileResponse.headers.get("Content-Type") || blob.type;

        const file = new File([blob], name, { type });
        sharedFiles.push({ file, name, size, type });
      }

      setFiles(sharedFiles);
    } catch {
      // Cache API not available or files not found
    }
    setLoading(false);
  }

  async function clearCache() {
    try {
      await caches.delete(SHARE_CACHE);
    } catch {
      // ignore
    }
  }

  function handleUploadAsDocument() {
    const rawFiles = files.map((f) => f.file);
    clearCache();
    navigate("/documentos/subir", { state: { sharedFiles: rawFiles } });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              No hay archivos compartidos pendientes.
            </p>
            <Button asChild variant="outline">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Archivos compartidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* File list */}
          <div className="space-y-2">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50"
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(f.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              ¿Qué quieres hacer con {files.length === 1 ? "este archivo" : "estos archivos"}?
            </p>

            <Button
              className="w-full justify-start gap-3 h-14"
              onClick={handleUploadAsDocument}
            >
              <Upload className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Subir como documento</p>
                <p className="text-xs opacity-80">
                  Añadir al repositorio de documentos
                </p>
              </div>
            </Button>

            <Button
              className="w-full justify-start gap-3 h-14"
              variant="outline"
              disabled
            >
              <ClipboardList className="h-5 w-5" />
              <div className="text-left">
                <p className="font-medium">Adjuntar a actividad</p>
                <p className="text-xs opacity-80">Próximamente</p>
              </div>
            </Button>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              clearCache();
              navigate("/");
            }}
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
