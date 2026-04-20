import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, ExternalLink } from "lucide-react";
import { useSiteConfig, useUpdateSite } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

const MINI_SITE_DOMAIN = import.meta.env.VITE_MINI_SITE_DOMAIN as string | undefined;

function buildPreviewUrl(slug: string): string {
  if (!slug) return "";
  if (MINI_SITE_DOMAIN) {
    return `https://${slug}.${MINI_SITE_DOMAIN}`;
  }
  return `${window.location.protocol}//${window.location.hostname}:3002/${slug}`;
}

export function AdminMiniSitePage() {
  const { data, isLoading } = useSiteConfig();
  const update = useUpdateSite();

  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [configText, setConfigText] = useState("{}");
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug || "");
    setEnabled(data.enabled);
    setConfigText(JSON.stringify(data.config || {}, null, 2));
  }, [data]);

  function handleSave() {
    if (slug && !SLUG_RE.test(slug)) {
      toast.error("Slug inválido. Usa letras minúsculas, números y guiones.");
      return;
    }
    let parsedConfig: Record<string, any>;
    try {
      parsedConfig = configText.trim() ? JSON.parse(configText) : {};
    } catch {
      setConfigError("JSON inválido");
      toast.error("El JSON de configuración no es válido");
      return;
    }
    setConfigError(null);

    update.mutate(
      { slug, enabled, config: parsedConfig },
      {
        onSuccess: () => toast.success("Mini-site actualizado"),
        onError: (err: any) => toast.error(err?.message || "Error al guardar"),
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mini-site</h1>
          <p className="text-muted-foreground">Página pública de tu asociación</p>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const previewUrl = slug ? buildPreviewUrl(slug) : null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mini-site</h1>
        <p className="text-muted-foreground">
          Página pública de tu asociación con eventos, cursos y galería.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Dirección pública
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug (nombre corto)</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="mi-asociacion"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground">
              Solo letras minúsculas, números y guiones. Cambiarlo rompe enlaces externos.
            </p>
          </div>

          {previewUrl && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">URL:</span>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                {previewUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicación</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={enabled}
              onCheckedChange={(v) => setEnabled(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <div className="font-medium text-sm">Mini-site activo</div>
              <p className="text-xs text-muted-foreground">
                Cuando está activo, la URL pública muestra la página. Si lo desactivas, devuelve 404.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contenido (JSON)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Editor visual en próxima iteración. De momento, edita el JSON con los bloques:{" "}
            <code className="text-xs">hero.title</code>,{" "}
            <code className="text-xs">hero.subtitle</code>,{" "}
            <code className="text-xs">about.text</code>,{" "}
            <code className="text-xs">gallery.enabled</code>.
          </p>
          <Textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            rows={14}
            className="font-mono text-xs"
            spellCheck={false}
          />
          {configError && (
            <p className="text-xs text-destructive">{configError}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
