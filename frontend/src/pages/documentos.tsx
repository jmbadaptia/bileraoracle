import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Plus, FileText, Search, X, Loader2 } from "lucide-react";
import { useDocuments, useFulltextSearch } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import {
  SESSION_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Convert **word** markers from ts_headline into <mark> elements */
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

const SESSION_TYPES = [
  "ALL",
  "COMMISSION",
  "PLENARY",
  "GOVERNMENT_BOARD",
  "PRESS_NOTE",
  "ORDINANCE",
  "OTHER",
] as const;

export function DocumentosPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useDocuments();
  const {
    data: searchData,
    isLoading: isSearching,
    isFetching: isSearchFetching,
  } = useFulltextSearch(debouncedQuery, activeTab);

  const documents = data?.documents || [];
  const total = data?.total || 0;
  const searchResults = searchData?.results || [];
  const isSearchActive = debouncedQuery.length >= 2;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">
            {total} documentos en el sistema
          </p>
        </div>
        <Link to="/documentos/subir">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Subir Documento
          </Button>
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative">
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

      {documents.length === 0 && !isSearchActive ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay documentos subidos.
            </p>
            <Link to="/documentos/subir" className="mt-4">
              <Button variant="outline">Subir primer documento</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto no-scrollbar gap-1">
            <TabsTrigger value="ALL">Todos</TabsTrigger>
            {SESSION_TYPES.slice(1).map((type) => (
              <TabsTrigger key={type} value={type}>
                {SESSION_TYPE_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Search results mode */}
          {isSearchActive ? (
            <div className="space-y-3 mt-4">
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
                    {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}
                  </p>
                  {searchResults.map((result: any) => (
                    <Link key={result.id} to={`/documentos/${result.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4">
                          <div className="flex items-start gap-3">
                            <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">
                                {result.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {SESSION_TYPE_LABELS[result.sessionType]}
                                </Badge>
                              </div>
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
          ) : (
            /* Normal document list mode */
            SESSION_TYPES.map((type) => (
              <TabsContent key={type} value={type} className="space-y-3">
                {documents
                  .filter(
                    (d: any) => type === "ALL" || d.sessionType === type
                  )
                  .map((doc: any) => (
                    <Link key={doc.id} to={`/documentos/${doc.id}`}>
                      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">
                                  {doc.title}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {SESSION_TYPE_LABELS[doc.sessionType]}
                                  </Badge>
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
                                  {doc.uploadedBy?.name} &middot;{" "}
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
              </TabsContent>
            ))
          )}
        </Tabs>
      )}
    </div>
  );
}
