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
    <div className="space-y-8">
      {/* Header con save en top-right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mini-site</h1>
          <p className="text-muted-foreground">
            Página pública de tu asociación con eventos, cursos y galería.
          </p>
        </div>
        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>

      {/* ── Sección: Identidad ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Identidad
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Dirección pública
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
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
                  Minúsculas, números y guiones. Cambiarlo rompe enlaces externos.
                </p>
              </div>

              {previewUrl && (
                <div className="text-sm pt-1">
                  <span className="text-muted-foreground">URL: </span>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
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
        </div>
      </section>

      {/* ── Sección: Portada ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Portada (Hero)
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Izquierda: campos */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="heroTitle">Título</Label>
                  <Input
                    id="heroTitle"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder={data?.slug ? `Ej: Asociación ${data.slug}` : "Título del hero"}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="heroSubtitle">Subtítulo</Label>
                  <Input
                    id="heroSubtitle"
                    value={heroSubtitle}
                    onChange={(e) => setHeroSubtitle(e.target.value)}
                    placeholder="Bienvenidos a nuestra asociación"
                  />
                </div>
              </div>

              {/* Derecha: imagen */}
              <div className="space-y-2">
                <Label>Imagen de fondo</Label>
                <div className="aspect-video rounded border bg-muted overflow-hidden flex items-center justify-center">
                  {heroImageUrl ? (
                    <img
                      key={heroKey}
                      src={heroImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">Sin imagen</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG o WebP. Máx 5MB. Recomendado 1920×1080.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleHeroUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadHero.isPending}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadHero.isPending ? "..." : heroImageUrl ? "Cambiar" : "Subir"}
                    </Button>
                    {heroImageUrl && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deleteHero.isPending}
                        onClick={handleHeroDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Sección: Secciones de contenido ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Contenido
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Sobre nosotros</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={8}
                placeholder="Describe quiénes sois, qué hacéis, historia de la asociación..."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bloques opcionales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={galleryEnabled}
                  onCheckedChange={(v) => setGalleryEnabled(!!v)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <div className="font-medium text-sm">Galería de fotos</div>
                  <p className="text-xs text-muted-foreground">
                    Muestra álbumes GENERAL en la página pública. (Próximamente)
                  </p>
                </div>
              </label>

              <div className="flex items-start gap-3 opacity-50">
                <Checkbox disabled className="mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-sm">Próximos eventos</div>
                  <p className="text-xs text-muted-foreground">
                    Automático desde tus actividades GENERAL. (Próximamente)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-50">
                <Checkbox disabled className="mt-0.5" />
                <div className="space-y-1">
                  <div className="font-medium text-sm">Cursos con inscripción</div>
                  <p className="text-xs text-muted-foreground">
                    Lista automática de cursos/talleres abiertos. (Próximamente)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
