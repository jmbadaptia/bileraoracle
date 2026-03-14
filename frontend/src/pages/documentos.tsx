import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, FileText, Search, X } from "lucide-react";
import { useDocuments } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useDocuments(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined
  );

  const documents = data?.documents || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Cargando..." : `${total} documentos en el sistema`}
          </p>
        </div>
        <Link to="/documentos/subir">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Subir
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por palabras clave..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="rounded-lg border divide-y">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-5 w-5 rounded shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {debouncedQuery.length >= 2 ? (
            <>
              <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                Sin resultados para &quot;{debouncedQuery}&quot;
              </p>
            </>
          ) : (
            <>
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No hay documentos subidos.</p>
              <Link to="/documentos/subir" className="mt-3">
                <Button variant="outline" size="sm">Subir primer documento</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="rounded-lg border divide-y">
          {documents.map((doc: any) => (
            <Link
              key={doc.id}
              to={`/documentos/${doc.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
            >
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {doc.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {doc.uploaderName} · {formatDate(doc.createdAt)} · {formatFileSize(doc.fileSize)} · {doc.fileName}
                </p>
              </div>
              <Badge
                variant={
                  doc.status === "READY"
                    ? "default"
                    : doc.status === "ERROR"
                      ? "destructive"
                      : "secondary"
                }
                className="text-[11px] shrink-0"
              >
                {DOCUMENT_STATUS_LABELS[doc.status]}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
