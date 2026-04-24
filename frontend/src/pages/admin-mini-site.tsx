import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ExternalLink,
  Upload,
  Trash2,
  ImageIcon,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  useSiteConfig,
  useUpdateSite,
  useUploadHero,
  useDeleteHero,
  useUpdateTheme,
  type SiteConfig,
} from "@/api/hooks";
import { useAuth } from "@/lib/auth";
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

const THEME_PRESETS = [
  { id: "default", label: "Naranja", color: "oklch(0.50 0.20 25)" },
  { id: "blue",    label: "Azul",    color: "oklch(0.50 0.18 250)" },
  { id: "green",   label: "Verde",   color: "oklch(0.52 0.17 150)" },
  { id: "violet",  label: "Violeta", color: "oklch(0.50 0.18 290)" },
  { id: "rose",    label: "Rosa",    color: "oklch(0.52 0.19 350)" },
  { id: "teal",    label: "Turquesa",color: "oklch(0.52 0.13 180)" },
];

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
  const { user } = useAuth();
  const update = useUpdateSite();
  const uploadHero = useUploadHero();
  const deleteHero = useDeleteHero();
  const updateTheme = useUpdateTheme();

  const [slug, setSlug] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [galleryEnabled, setGalleryEnabled] = useState(false);
  const [heroKey, setHeroKey] = useState(0);
  const [currentTheme, setCurrentTheme] = useState(() => user?.theme || "default");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");
  const [contactoDireccion, setContactoDireccion] = useState("");
  const [contactoFacebook, setContactoFacebook] = useState("");
  const [contactoInstagram, setContactoInstagram] = useState("");
  const [metaCategoria, setMetaCategoria] = useState("");
  const [metaCiudad, setMetaCiudad] = useState("");
  const [metaAnoFundacion, setMetaAnoFundacion] = useState("");
  const [metaNumSocios, setMetaNumSocios] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setSlug(data.slug || "");
    setEnabled(data.enabled);
    setHeroTitle(data.config.hero?.title || "");
    setHeroSubtitle(data.config.hero?.subtitle || "");
    setAboutText(data.config.about?.text || "");
    setGalleryEnabled(!!data.config.gallery?.enabled);
    setContactoEmail(data.config.contacto?.email || "");
    setContactoTelefono(data.config.contacto?.telefono || "");
    setContactoDireccion(data.config.contacto?.direccion || "");
    setContactoFacebook(data.config.contacto?.facebook || "");
    setContactoInstagram(data.config.contacto?.instagram || "");
    setMetaCategoria(data.config.meta?.categoria || "");
    setMetaCiudad(data.config.meta?.ciudad || "");
    setMetaAnoFundacion(data.config.meta?.anoFundacion ? String(data.config.meta.anoFundacion) : "");
    setMetaNumSocios(data.config.meta?.numSocios ? String(data.config.meta.numSocios) : "");
  }, [data]);

  function handleSave() {
    if (slug && !SLUG_RE.test(slug)) {
      toast.error("Slug inválido. Usa letras minúsculas, números y guiones.");
      return;
    }
    const contacto: SiteConfig["contacto"] = {
      ...(contactoEmail.trim() ? { email: contactoEmail.trim() } : {}),
      ...(contactoTelefono.trim() ? { telefono: contactoTelefono.trim() } : {}),
      ...(contactoDireccion.trim() ? { direccion: contactoDireccion.trim() } : {}),
      ...(contactoFacebook.trim() ? { facebook: contactoFacebook.trim() } : {}),
      ...(contactoInstagram.trim() ? { instagram: contactoInstagram.trim() } : {}),
    };
    const ano = parseInt(metaAnoFundacion, 10);
    const socios = parseInt(metaNumSocios, 10);
    const meta: SiteConfig["meta"] = {
      ...(metaCategoria.trim() ? { categoria: metaCategoria.trim() } : {}),
      ...(metaCiudad.trim() ? { ciudad: metaCiudad.trim() } : {}),
      ...(Number.isFinite(ano) && ano > 0 ? { anoFundacion: ano } : {}),
      ...(Number.isFinite(socios) && socios > 0 ? { numSocios: socios } : {}),
    };
    const config: SiteConfig = {
      hero: {
        ...(heroTitle.trim() ? { title: heroTitle.trim() } : {}),
        ...(heroSubtitle.trim() ? { subtitle: heroSubtitle.trim() } : {}),
      },
      about: aboutText.trim() ? { text: aboutText.trim() } : {},
      gallery: { enabled: galleryEnabled },
      ...(Object.keys(contacto).length > 0 ? { contacto } : {}),
      ...(Object.keys(meta).length > 0 ? { meta } : {}),
    };
    update.mutate(
      { slug, enabled, config },
      {
        onSuccess: () => toast.success("Web actualizada"),
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

  function handleThemeChange(themeId: string) {
    const prev = currentTheme;
    setCurrentTheme(themeId);
    if (themeId !== "default") {
      document.documentElement.setAttribute("data-theme", themeId);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    updateTheme.mutate(themeId, {
      onSuccess: () => {
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          u.theme = themeId;
          localStorage.setItem("user", JSON.stringify(u));
        }
        toast.success("Color actualizado");
      },
      onError: () => {
        toast.error("Error al guardar el color");
        setCurrentTheme(prev);
        if (prev !== "default") {
          document.documentElement.setAttribute("data-theme", prev);
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      },
    });
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
          <h1 className="text-2xl font-bold tracking-tight">Web</h1>
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
          <h1 className="text-2xl font-bold tracking-tight">Web</h1>
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
              <div className="font-medium text-sm">Web activa</div>
              <p className="text-xs text-muted-foreground">
                Cuando está activo, la URL pública muestra la página. Si no, devuelve 404.
              </p>
            </div>
          </label>
        </div>
      </Section>

      {/* ── Color ── */}
      <Section number={2} title="Color" subtitle="Color principal de la web y del panel de Bilera">
        <div className="pt-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Elige el color que se usará en los botones, acentos y enlaces de tu web. El mismo color se aplica al panel de gestión.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleThemeChange(preset.id)}
                className="flex flex-col items-center gap-1.5 group"
                title={preset.label}
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-background transition-all"
                  style={{
                    backgroundColor: preset.color,
                    outlineColor: currentTheme === preset.id ? preset.color : "transparent",
                  }}
                >
                  {currentTheme === preset.id && <Check className="h-4 w-4 text-white" />}
                </div>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Portada ── */}
      <Section number={3} title="Portada" subtitle="Título, subtítulo e imagen de fondo">
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
      <Section number={4} title="Sobre nosotros" subtitle="Descripción y datos de tu asociación">
        <div className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="aboutText">Descripción</Label>
            <Textarea
              id="aboutText"
              value={aboutText}
              onChange={(e) => setAboutText(e.target.value)}
              rows={6}
              placeholder="Describe quiénes sois, qué hacéis, historia de la asociación..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="metaCategoria">Tipo / categoría</Label>
              <Input
                id="metaCategoria"
                value={metaCategoria}
                onChange={(e) => setMetaCategoria(e.target.value)}
                placeholder="Ej: Asociación cultural"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="metaCiudad">Ciudad</Label>
              <Input
                id="metaCiudad"
                value={metaCiudad}
                onChange={(e) => setMetaCiudad(e.target.value)}
                placeholder="Ej: Pamplona"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metaAno">Año de fundación</Label>
              <Input
                id="metaAno"
                type="number"
                inputMode="numeric"
                value={metaAnoFundacion}
                onChange={(e) => setMetaAnoFundacion(e.target.value)}
                placeholder="2005"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="metaSocios">Nº de socios</Label>
              <Input
                id="metaSocios"
                type="number"
                inputMode="numeric"
                value={metaNumSocios}
                onChange={(e) => setMetaNumSocios(e.target.value)}
                placeholder="120"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estos datos aparecen en la portada de la web (categoría · ciudad debajo del título, "+X socios" en la parte inferior).
          </p>
        </div>
      </Section>

      {/* ── Contacto ── */}
      <Section number={5} title="Contacto" subtitle="Email, teléfono, dirección y redes sociales">
        <div className="grid gap-4 md:grid-cols-2 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="contactoEmail">Email *</Label>
            <Input
              id="contactoEmail"
              type="email"
              value={contactoEmail}
              onChange={(e) => setContactoEmail(e.target.value)}
              placeholder="info@miasociacion.org"
            />
            <p className="text-xs text-muted-foreground">
              Recibirás aquí los mensajes del formulario de la web. Obligatorio para que el formulario funcione.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactoTelefono">Teléfono</Label>
            <Input
              id="contactoTelefono"
              value={contactoTelefono}
              onChange={(e) => setContactoTelefono(e.target.value)}
              placeholder="600 123 456"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="contactoDireccion">Dirección</Label>
            <Input
              id="contactoDireccion"
              value={contactoDireccion}
              onChange={(e) => setContactoDireccion(e.target.value)}
              placeholder="Calle Mayor 12, 31001 Pamplona"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactoFacebook">Facebook</Label>
            <Input
              id="contactoFacebook"
              value={contactoFacebook}
              onChange={(e) => setContactoFacebook(e.target.value)}
              placeholder="https://facebook.com/miasociacion"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contactoInstagram">Instagram</Label>
            <Input
              id="contactoInstagram"
              value={contactoInstagram}
              onChange={(e) => setContactoInstagram(e.target.value)}
              placeholder="https://instagram.com/miasociacion"
            />
          </div>
        </div>
      </Section>

      {/* ── Bloques opcionales ── */}
      <Section
        number={6}
        title="Bloques opcionales"
        subtitle="Galería, eventos, cursos…"
        defaultOpen={false}
      >
        <div className="space-y-4 pt-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={galleryEnabled}
              onCheckedChange={(v) => setGalleryEnabled(!!v)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <div className="font-medium text-sm">Galería de fotos</div>
              <p className="text-xs text-muted-foreground">
                Si está activo, la web muestra hasta 12 fotos de tus álbumes públicos. Marca o desmarca cada álbum como público al editarlo desde Galería.
              </p>
            </div>
          </label>

          <p className="text-xs text-muted-foreground border-t pt-3">
            <strong>Próximos eventos</strong> y <strong>Cursos con inscripción</strong> aparecen automáticamente en la web cuando publiques actividades con visibilidad GENERAL en Actividades / Cursos.
          </p>
        </div>
      </Section>
    </div>
  );
}
