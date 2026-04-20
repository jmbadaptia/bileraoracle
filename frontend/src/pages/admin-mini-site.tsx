import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Globe, ExternalLink, Upload, Trash2, ImageIcon } from "lucide-react";
import {
  useSiteConfig,
  useUpdateSite,
  useUploadHero,
  useDeleteHero,
  type SiteConfig,
} from "@/api/hooks";
import { api } from "@/lib/api-client";
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
  if (MINI_SITE_DOMAIN) return `https://${slug}.${MINI_SITE_DOMAIN}`;
  return `${window.location.protocol}//${window.location.hostname}:3002/${slug}`;
}

export function AdminMiniSitePage() {
  const { data, isLoading } = useSiteConfig();
  const update = useUpdateSite();
  const uploadHero = useUploadHero();
  const deleteHero = useDeleteHero();

  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [galleryEnabled, setGalleryEnabled] = useState(false);
  const [heroKey, setHeroKey] = useState(0);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug || "");
    setEnabled(data.enabled);
    setHeroTitle(data.config.hero?.title || "");
    setHeroSubtitle(data.config.hero?.subtitle || "");
    setAboutText(data.config.about?.text || "");
    setGalleryEnabled(!!data.config.gallery?.enabled);
  }, [data]);

  function handleSave() {
    if (slug && !SLUG_RE.test(slug)) {
      toast.error("Slug inválido. Usa letras minúsculas, números y guiones.");
      return;
    }
    const config: SiteConfig = {
      hero: {
        ...(heroTitle.trim() ? { title: heroTitle.trim() } : {}),
        ...(heroSubtitle.trim() ? { subtitle: heroSubtitle.trim() } : {}),
      },
      about: aboutText.trim() ? { text: aboutText.trim() } : {},
      gallery: { enabled: galleryEnabled },
    };
    update.mutate(
      { slug, enabled, config },
      {
        onSuccess: () => toast.success("Mini-site actualizado"),
        onError: (err: any) => toast.error(err?.message || "Error al guardar"),
      }
    );
  }

  function handleHeroUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadHero.mutate(file, {
      onSuccess: () => {
        setHeroKey((k) => k + 1);
        toast.success("Imagen de portada actualizada");
      },
      onError: (err: any) => toast.error(err?.message || "Error al subir"),
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleHeroDelete() {
    deleteHero.mutate(undefined, {
      onSuccess: () => {
        setHeroKey((k) => k + 1);
        toast.success("Imagen eliminada");
      },
      onError: (err: any) => toast.error(err?.message || "Error al eliminar"),
    });
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
  const heroImageUrl = slug && data?.hasHero ? api.streamUrl(`/public/sites/${slug}/hero-image?v=${heroKey}`) : null;

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
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Portada (Hero)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heroTitle">Título</Label>
              <Input
                id="heroTitle"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder={data?.slug ? `Ej: Asociación ${data.slug}` : "Título del hero"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="heroSubtitle">Subtítulo</Label>
              <Input
                id="heroSubtitle"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Bienvenidos a nuestra asociación"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagen de portada</Label>
            <div className="flex items-start gap-4">
              <div className="h-24 w-40 rounded border bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {heroImageUrl ? (
                  <img
                    key={heroKey}
                    src={heroImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-xs text-muted-foreground">
                  PNG, JPG o WebP, máx. 5MB. Recomendado: 1920×1080.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleHeroUpload}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadHero.isPending}
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploadHero.isPending ? "Subiendo..." : heroImageUrl ? "Cambiar" : "Subir"}
                  </Button>
                  {heroImageUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={deleteHero.isPending}
                      onClick={handleHeroDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Quitar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre nosotros</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            rows={6}
            placeholder="Describe quiénes sois, qué hacéis, historia de la asociación..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Galería</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={galleryEnabled}
              onCheckedChange={(v) => setGalleryEnabled(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <div className="font-medium text-sm">Mostrar galería de fotos</div>
              <p className="text-xs text-muted-foreground">
                Muestra los álbumes marcados como GENERAL en la página pública. (Próximamente)
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
