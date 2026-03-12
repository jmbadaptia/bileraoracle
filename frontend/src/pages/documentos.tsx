import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, FileText, Search, X } from "lucide-react";
import { useDocuments } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCardSkeleton() {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          {isLoading ? (
            <Skeleton className="h-4 w-40 mt-1" />
          ) : (
            <p className="text-muted-foreground">
              {total} documentos en el sistema
            </p>
          )}
        </div>
        <Link to="/documentos/subir">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por palabras clave..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 pr-9"
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

      {isLoading ? (
        <div className="space-y-3">
          <DocCardSkeleton />
          <DocCardSkeleton />
          <DocCardSkeleton />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {debouncedQuery.length >= 2 ? (
              <>
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Sin resultados para &quot;{debouncedQuery}&quot;
                </p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay documentos subidos.</p>
                <Link to="/documentos/subir" className="mt-4">
                  <Button variant="outline">Subir primer documento</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc: any) => (
            <Link key={doc.id} to={`/documentos/${doc.id}`}>
              <Card className="transition-all hover:bg-muted/50 hover:shadow-sm cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{doc.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          <Badge
                            variant={
                              doc.status === "READY"
                                ? "default"
                                : doc.status === "ERROR"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {DOCUMENT_STATUS_LABELS[doc.status]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.uploaderName} &middot;{" "}
                          {formatDate(doc.createdAt)} &middot;{" "}
                          {formatFileSize(doc.fileSize)} &middot;{" "}
                          {doc.fileName}
                        </p>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {doc.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
