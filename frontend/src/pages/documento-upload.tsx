import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, File, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useDocumentCategories } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function titleFromFilename(filename: string): string {
  const name = filename.replace(/\.[^/.]+$/, "");
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentoUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: catData } = useDocumentCategories();
  const categories = catData?.categories || [];

  // Pre-fill from shared files (Share Target)
  useEffect(() => {
    const sharedFiles = (location.state as any)?.sharedFiles as File[] | undefined;
    if (sharedFiles?.length) {
      setSelectedFile(sharedFiles[0]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill title from filename
  useEffect(() => {
    if (selectedFile && !title) {
      setTitle(titleFromFilename(selectedFile.name));
    }
  }, [selectedFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-generate description from file content
  useEffect(() => {
    if (!selectedFile) return;
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "docx", "txt"].includes(ext)) return;

    setGeneratingDesc(true);
    const formData = new FormData();
    formData.set("file", selectedFile);

    api
      .upload<{ summary: string }>("/documents/summarize", formData)
      .then((data) => {
        if (data.summary) setDescription(data.summary);
      })
      .catch(() => {
        // Silently fail - user can still write description manually
      })
      .finally(() => setGeneratingDesc(false));
  }, [selectedFile]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTitle("");
      setDescription("");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Selecciona un archivo");
      return;
    }
    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      formData.set("title", title);
      formData.set("description", description);
      if (selectedCategoryIds.length) {
        formData.set("categoryIds", selectedCategoryIds.join(","));
      }

      await api.upload<{ id: string }>("/documents", formData);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento subido correctamente");
      navigate("/documentos");
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el documento");
    }

    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Subir Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Drop Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.odt"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setTitle("");
                      setDescription("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-medium">
                    Arrastra un archivo aqui o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PDF, DOCX, DOC, TXT, ODT (max. 50MB)
                  </p>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Titulo *</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Titulo del documento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descripcion
                {generatingDesc && (
                  <span className="ml-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generando resumen...
                  </span>
                )}
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Breve descripcion del contenido del documento..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Categorías</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c: any) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCategoryIds(prev =>
                        prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id]
                      )}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                        selectedCategoryIds.includes(c.id)
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-muted-foreground/20 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={loading || !selectedFile}>
                {loading ? "Subiendo..." : "Subir Documento"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
