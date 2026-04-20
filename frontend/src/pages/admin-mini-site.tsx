import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Upload,
  Trash2,
  ImageIcon,
  ChevronDown,
} from "lucide-react";
import {
  useSiteConfig,
  useUpdateSite,
  useUploadHero,
  useDeleteHero,
  type SiteConfig,
} from "@/api/hooks";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const MINI_SITE_DOMAIN = import.meta.env.VITE_MINI_SITE_DOMAIN as string | undefined;

function buildPreviewUrl(slug: string): string {
  if (!slug) return "";
  if (MINI_SITE_DOMAIN) return `https://${slug}.${MINI_SITE_DOMAIN}`;
  return `${window.location.protocol}//${window.location.hostname}:3002/${slug}`;
}

// ── Collapsible section (same look as inscripcion-form wizard) ──────────
function Section({
  number,
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border bg-card overflow-hidden">
      <summary
        className={cn(
          "flex items-center gap-3 px-5 py-4 cursor-pointer select-none list-none transition-colors",
          "hover:bg-muted/20 [&::-webkit-details-marker]:hidden",
        )}
      >
        <div
          className={cn(
            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
            "border-2 border-muted-foreground/20 text-muted-foreground",
            "group-open:bg-primary group-open:text-primary-foreground group-open:border-primary",
          )}
        >
          {number}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold transition-colors group-open:text-primary">
            {title}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-0.5 group-open:hidden">
              {subtitle}
            </div>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-5 pb-5 pt-2 ml-10">{children}</div>
    </details>
  );
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
    <div className="space-y-6">
      {/* Header */}
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

      {/* ── Identidad ── */}
      <Section number={1} title="Identidad" subtitle="Slug, URL pública y estado de publicación">
        <div className="grid gap-5 md:grid-cols-[2fr_1fr] ">
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
          </div>

          <label className="flex items-start gap-3 cursor-pointer md:border-l md:pl-5">
            <Checkbox
              checked={enabled}
              onCheckedChange={(v) => setEnabled(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <div className="font-medium text-sm">Mini-site activo</div>
              <p className="text-xs text-muted-foreground">
                Cuando está activo, la URL pública muestra la página. Si no, devuelve 404.
              </p>
            </div>
          </label>
        </div>
      </Section>

      {/* ── Portada ── */}
      <Section number={2} title="Portada" subtitle="Título, subtítulo e imagen de fondo">
        <div className="grid gap-5 md:grid-cols-[3fr_2fr] ">
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
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
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
              <p className="text-xs text-muted-foreground ml-auto">
                PNG/JPG/WebP · 5MB · 1920×1080
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Sobre nosotros ── */}
      <Section number={3} title="Sobre nosotros" subtitle="Descripción de tu asociación">
        <div className="">
          <Textarea
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            rows={6}
            placeholder="Describe quiénes sois, qué hacéis, historia de la asociación..."
          />
        </div>
      </Section>

      {/* ── Bloques opcionales ── */}
      <Section
        number={4}
        title="Bloques opcionales"
        subtitle="Galería, eventos, cursos…"
        defaultOpen={false}
      >
        <div className="grid gap-4 md:grid-cols-3 ">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={galleryEnabled}
              onCheckedChange={(v) => setGalleryEnabled(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <div className="font-medium text-sm">Galería de fotos</div>
              <p className="text-xs text-muted-foreground">
                Álbumes GENERAL en el mini-site. (Próximamente)
              </p>
            </div>
          </label>

          <div className="flex items-start gap-3 opacity-50">
            <Checkbox disabled className="mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-sm">Próximos eventos</div>
              <p className="text-xs text-muted-foreground">
                Actividades GENERAL automáticas. (Próximamente)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 opacity-50">
            <Checkbox disabled className="mt-0.5" />
            <div className="space-y-1">
              <div className="font-medium text-sm">Cursos con inscripción</div>
              <p className="text-xs text-muted-foreground">
                Talleres/cursos abiertos. (Próximamente)
              </p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
