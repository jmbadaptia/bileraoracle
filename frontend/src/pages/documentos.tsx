import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router";
import { Plus, FileText, Search, X, LayoutGrid, List } from "lucide-react";
import { useDocuments, useDocumentCategories } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type StatusFilter = "all" | "READY" | "PROCESSING" | "PENDING" | "ERROR";
type ViewMode = "grid" | "list";

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusVariant(status: string) {
  if (status === "READY") return "default" as const;
  if (status === "ERROR") return "destructive" as const;
  if (status === "PROCESSING") return "warning" as const;
  return "secondary" as const;
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "READY", label: "Listo" },
  { value: "PROCESSING", label: "Procesando" },
  { value: "PENDING", label: "Pendiente" },
  { value: "ERROR", label: "Error" },
];

export function DocumentosPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { data: catData } = useDocumentCategories();
  const categories = catData?.categories || [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const docParams: Record<string, string> = {};
  if (debouncedQuery.length >= 2) docParams.search = debouncedQuery;
  if (categoryFilter) docParams.category = categoryFilter;
  const { data, isLoading } = useDocuments(Object.keys(docParams).length ? docParams : undefined);

  const documents = data?.documents || [];

  const filtered = useMemo(() => {
    if (statusFilter === "all") return documents;
    return documents.filter((d: any) => d.status === statusFilter);
  }, [documents, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentos</h1>
          <p className="text-muted-foreground">Gestiona y consulta los documentos de tu organización</p>
        </div>
        <Link to="/documentos/subir">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Subir
          </Button>
        </Link>
      </div>

      {/* Search + Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
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
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border p-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vista cuadrícula"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            title="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              !categoryFilter
                ? "bg-primary text-primary-foreground border-primary"
                : "text-muted-foreground border-muted-foreground/20 hover:border-primary/40"
            }`}
          >
            Todas
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(categoryFilter === c.name ? "" : c.name)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                categoryFilter === c.name
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-muted-foreground/20 hover:border-primary/40"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
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
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No se encontraron documentos con estos filtros</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((doc: any) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Subido por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc: any) => (
                  <TableRow key={doc.id} className="group">
                    <TableCell>
                      <Link to={`/documentos/${doc.id}`} className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium group-hover:text-primary transition-colors block truncate">
                            {doc.title}
                          </span>
                          <span className="text-xs text-muted-foreground truncate block">{doc.fileName}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{doc.uploaderName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(doc.createdAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatFileSize(doc.fileSize)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(doc.status)} className="text-[11px]">
                        {DOCUMENT_STATUS_LABELS[doc.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-2">
            {filtered.map((doc: any) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DocumentCard({ doc }: { doc: any }) {
  return (
    <Link to={`/documentos/${doc.id}`}>
      <Card className="hover:border-primary/30 transition-colors cursor-pointer h-full">
        <CardContent className="pt-5 pb-4 space-y-2">
          {/* Title + Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <h3 className="font-semibold text-sm truncate">{doc.title}</h3>
            </div>
            <Badge variant={getStatusVariant(doc.status)} className="text-xs shrink-0">
              {DOCUMENT_STATUS_LABELS[doc.status]}
            </Badge>
          </div>

          {/* File name */}
          <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>

          {/* Categories */}
          {doc.categories?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {doc.categories.map((cat: string) => (
                <Badge key={cat} variant="outline" className="text-[10px] px-1.5 py-0">{cat}</Badge>
              ))}
            </div>
          )}

          {/* Meta: uploader, date, size */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {doc.uploaderName && <span>{doc.uploaderName}</span>}
            <span>{formatDate(doc.createdAt)}</span>
            <span>{formatFileSize(doc.fileSize)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
