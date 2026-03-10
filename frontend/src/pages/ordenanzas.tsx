import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Scale,
  Search,
  X,
  Loader2,
  RefreshCw,
  ExternalLink,
  FileText,
} from "lucide-react";
import { useOrdinances, useScrapeOrdinances, useFulltextSearch } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HighlightSnippet({ text }: { text: string }) {
  const parts = text.split(/\*\*/);
  return (
    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

/** Group documents by their first tag (category) */
function groupByCategory(documents: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const doc of documents) {
    const category =
      doc.tags && doc.tags.length > 0
        ? doc.tags[0].tag.name
        : "Sin categoría";
    if (!groups[category]) groups[category] = [];
    groups[category].push(doc);
  }
  // Sort groups alphabetically
  const sorted: Record<string, any[]> = {};
  for (const key of Object.keys(groups).sort()) {
    sorted[key] = groups[key];
  }
  return sorted;
}

export function OrdenanzasPage() {
  const { isAdmin } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useOrdinances();
  const {
    data: searchData,
    isLoading: isSearching,
    isFetching: isSearchFetching,
  } = useFulltextSearch(debouncedQuery, "ORDINANCE");

  const scrape = useScrapeOrdinances();

  const documents = data?.documents || [];
  const total = data?.total || 0;
  const searchResults = searchData?.results || [];
  const isSearchActive = debouncedQuery.length >= 2;
  const grouped = groupByCategory(documents);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordenanzas Municipales</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Ordenanzas Municipales
          </h1>
          <p className="text-muted-foreground">
            {total} ordenanzas del Valle de Egüés
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => scrape.mutate()}
            disabled={scrape.isPending}
          >
            {scrape.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sincronizar ordenanzas
          </Button>
        )}
      </div>

      {/* Scrape result feedback */}
      {scrape.isSuccess && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-green-700 dark:text-green-400">
              {(scrape.data as any).message}
            </p>
          </CardContent>
        </Card>
      )}
      {scrape.isError && (
        <Card>
          <CardContent className="py-3">
            <p className="text-sm text-destructive">
              Error al sincronizar:{" "}
              {(scrape.error as any)?.message || "Error desconocido"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar en ordenanzas..."
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

      {/* Search results mode */}
      {isSearchActive ? (
        <div className="space-y-3">
          {isSearching || isSearchFetching ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Buscando...
            </div>
          ) : searchResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Sin resultados para &quot;{debouncedQuery}&quot;
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {searchResults.length} resultado
                {searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map((result: any) => (
                <Link key={result.id} to={`/documentos/${result.id}`}>
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Scale className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {result.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1">
                            {result.uploadedBy} &middot;{" "}
                            {formatDate(result.createdAt)} &middot;{" "}
                            {result.fileName}
                          </p>
                          {result.snippet && (
                            <HighlightSnippet text={result.snippet} />
                          )}
                          {!result.snippet && result.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </>
          )}
        </div>
      ) : documents.length === 0 ? (
        /* Empty state */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              No hay ordenanzas importadas todavía.
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => scrape.mutate()}
                disabled={scrape.isPending}
              >
                {scrape.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Importar ordenanzas
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Grouped by category */
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, docs]) => (
            <div key={category}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                {category}
                <Badge variant="secondary" className="text-xs ml-1">
                  {docs.length}
                </Badge>
              </h2>
              <div className="space-y-2">
                {docs.map((doc: any) => (
                  <Link key={doc.id} to={`/documentos/${doc.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">
                                {doc.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-0.5">
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
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(doc.createdAt)} &middot;{" "}
                                  {formatFileSize(doc.fileSize)}
                                </span>
                              </div>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>
                          {doc.sourceUrl && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(doc.sourceUrl, "_blank", "noopener,noreferrer");
                              }}
                              className="text-muted-foreground hover:text-foreground shrink-0"
                              title="Ver PDF original"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
