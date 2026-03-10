import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { toast } from "sonner";
import { Upload, File, X, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { SESSION_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [sessionType, setSessionType] = useState("OTHER");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      formData.set("sessionType", sessionType);

      const sessionDateInput = (
        e.currentTarget.elements.namedItem("sessionDate") as HTMLInputElement
      )?.value;
      if (sessionDateInput) {
        formData.set("sessionDate", sessionDateInput);
      }

      const doc = await api.upload<{ id: string }>("/documents", formData);
      toast.success("Documento subido correctamente");

      // Trigger embedding processing in background
      api.post("/documents/process", { documentId: doc.id }).catch(() => {
        // Processing is best-effort
      });

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

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Tipo de sesion *</Label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SESSION_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionDate">Fecha de la sesion</Label>
                <Input id="sessionDate" name="sessionDate" type="date" />
              </div>
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
