import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft,
  Cloud,
  FolderOpen,
  FileText,
  ChevronRight,
  Loader2,
  LogOut,
  Download,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  useCloudConnections,
  useCloudFiles,
  useCloudImport,
  useDisconnectCloud,
} from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

function formatFileSize(bytes: number | null) {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface CloudFileItem {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedAt: string;
  isFolder: boolean;
  status?: "new" | "imported" | "modified";
  documentId?: string | null;
}

type BreadcrumbItem = { id: string | undefined; name: string };

export function DocumentosNubePage() {
  const [searchParams] = useSearchParams();
  const [folderPath, setFolderPath] = useState<BreadcrumbItem[]>([
    { id: undefined, name: "Mi Drive" },
  ]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const currentFolderId = folderPath[folderPath.length - 1].id;

  const { data: connectionsData, isLoading: loadingConns } =
    useCloudConnections();
  const connections = connectionsData?.connections || [];
  const googleConn = connections.find(
    (c: any) => c.provider === "GOOGLE_DRIVE"
  );

  const {
    data: filesData,
    isLoading: loadingFiles,
    isFetching,
  } = useCloudFiles(googleConn?.id || "", currentFolderId);
  const files: CloudFileItem[] = filesData?.files || [];

  const importMutation = useCloudImport();
  const disconnectMutation = useDisconnectCloud();

  // Show toast on OAuth redirect
  useState(() => {
    if (searchParams.get("connected") === "1") {
      toast.success("Google Drive conectado correctamente");
    }
    if (searchParams.get("error")) {
      toast.error("Error al conectar Google Drive");
    }
  });

  const selectableFiles = useMemo(
    () => files.filter((f) => !f.isFolder && f.status !== "imported"),
    [files]
  );

  const allSelected =
    selectableFiles.length > 0 &&
    selectableFiles.every((f) => selected.has(f.id));

  function toggleSelect(fileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableFiles.map((f) => f.id)));
    }
  }

  function navigateToFolder(file: CloudFileItem) {
    setFolderPath((prev) => [...prev, { id: file.id, name: file.name }]);
    setSelected(new Set());
  }

  function navigateToBreadcrumb(index: number) {
    setFolderPath((prev) => prev.slice(0, index + 1));
    setSelected(new Set());
  }

  function handleConnect() {
    window.location.href = `${API_BASE}/cloud/auth/GOOGLE_DRIVE`;
  }

  function handleDisconnect() {
    if (!googleConn) return;
    disconnectMutation.mutate(googleConn.id, {
      onSuccess: () => toast.success("Google Drive desconectado"),
    });
  }

  async function handleImport() {
    if (!googleConn || selected.size === 0) return;

    const filesToImport = files
      .filter((f) => selected.has(f.id))
      .map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType }));

    importMutation.mutate(
      { connectionId: googleConn.id, files: filesToImport },
      {
        onSuccess: (data: any) => {
          toast.success(
            `${data.imported.length} archivo(s) importado(s) correctamente`
          );
          setSelected(new Set());
        },
        onError: () => toast.error("Error al importar archivos"),
      }
    );
  }

  if (loadingConns) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/documentos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Importar desde la nube
            </h1>
            <p className="text-muted-foreground">
              Conecta tu cuenta y selecciona archivos para importar
            </p>
          </div>
        </div>
      </div>

      {/* Connection status */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          {googleConn ? (
            <>
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Google Drive</p>
                  <p className="text-sm text-muted-foreground">
                    {googleConn.providerEmail}
                  </p>
                </div>
                <Badge variant="secondary">Conectado</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={disconnectMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Cloud className="h-5 w-5 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No hay ninguna cuenta de Google Drive conectada
                </p>
              </div>
              <Button onClick={handleConnect}>
                <Cloud className="mr-2 h-4 w-4" />
                Conectar Google Drive
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* File browser */}
      {googleConn && (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm">
            {folderPath.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <button
                  onClick={() => navigateToBreadcrumb(i)}
                  className={`hover:underline ${
                    i === folderPath.length - 1
                      ? "font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {item.name}
                </button>
              </div>
            ))}
            {isFetching && (
              <Loader2 className="ml-2 h-3 w-3 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* File table */}
          {loadingFiles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FolderOpen className="mb-2 h-10 w-10" />
                <p>Esta carpeta está vacía</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      {selectableFiles.length > 0 && (
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                        />
                      )}
                    </TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Tamaño
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Modificado
                    </TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow
                      key={file.id}
                      className={file.isFolder ? "cursor-pointer" : ""}
                      onClick={
                        file.isFolder
                          ? () => navigateToFolder(file)
                          : undefined
                      }
                    >
                      <TableCell>
                        {!file.isFolder && file.status !== "imported" && (
                          <Checkbox
                            checked={selected.has(file.id)}
                            onCheckedChange={() => toggleSelect(file.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {!file.isFolder && file.status === "imported" && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {file.isFolder ? (
                            <FolderOpen className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={
                              file.isFolder ? "font-medium text-blue-600" : ""
                            }
                          >
                            {file.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {file.isFolder ? "—" : formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(file.modifiedAt)}
                      </TableCell>
                      <TableCell>
                        {file.status === "imported" && (
                          <Badge variant="secondary">Importado</Badge>
                        )}
                        {file.status === "modified" && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600">
                            Modificado
                          </Badge>
                        )}
                        {file.status === "new" && (
                          <Badge variant="outline">Nuevo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          {/* Import action */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
              <p className="text-sm">
                {selected.size} archivo(s) seleccionado(s)
              </p>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Importar seleccionados
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
