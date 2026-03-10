import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Search, FileText, Loader2 } from "lucide-react";
import { useFulltextSearch } from "@/api/hooks";
import { SESSION_TYPE_LABELS } from "@/lib/constants";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface FulltextResult {
  id: string;
  title: string;
  description: string | null;
  sessionType: string;
  fileName: string;
  createdAt: string;
  uploadedBy: string;
  score: number;
  snippet: string | null;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SnippetText({ text }: { text: string }) {
  // Backend returns **highlighted** text — render as <mark>
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <p className="text-xs text-muted-foreground line-clamp-2">
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export function FulltextSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sessionType, setSessionType] = useState("ALL");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 300);
  const { data, isLoading } = useFulltextSearch(debouncedQuery, sessionType);
  const results: FulltextResult[] = data?.results ?? [];

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Reset state when dialog closes
  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value);
    if (!value) {
      setQuery("");
      setSessionType("ALL");
    }
  }, []);

  function navigateToDocument(id: string) {
    setOpen(false);
    navigate(`/documentos/${id}`);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setOpen(true)}
        aria-label="Buscar documentos"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-lg p-0 gap-0 overflow-hidden max-h-[80vh] flex flex-col"
        >
          <DialogHeader className="p-4 pb-0 space-y-3">
            <DialogTitle className="sr-only">Buscar documentos</DialogTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                autoFocus
                placeholder="Buscar documentos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="border-0 shadow-none focus-visible:ring-0 h-9 px-0"
              />
            </div>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder="Tipo de sesión" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </DialogHeader>

          <div className="border-t mt-3" />

          <div className="overflow-y-auto flex-1 min-h-0 max-h-[50vh]">
            {/* Empty state — no query */}
            {!debouncedQuery || debouncedQuery.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Escribe para buscar...
              </p>
            ) : isLoading ? (
              /* Loading skeletons */
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : results.length === 0 ? (
              /* No results */
              <p className="text-sm text-muted-foreground text-center py-8">
                No se encontraron resultados
              </p>
            ) : (
              /* Results list */
              <div className="divide-y">
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => navigateToDocument(result.id)}
                    className="w-full text-left px-4 py-3 hover:bg-accent transition-colors focus:bg-accent outline-none"
                  >
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium truncate">
                          {result.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {SESSION_TYPE_LABELS[result.sessionType] || result.sessionType}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {result.uploadedBy} · {formatDate(result.createdAt)}
                          </span>
                        </div>
                        {result.snippet && <SnippetText text={result.snippet} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer with shortcut hint */}
          <div className="border-t px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {results.length > 0 && `${results.length} resultado${results.length !== 1 ? "s" : ""}`}
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
              Esc para cerrar
            </kbd>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
