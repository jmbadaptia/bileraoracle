import { useState, useRef } from "react";
import { Link } from "react-router";
import { Users, FileText, Database, Upload, ImageIcon, Palette, Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAdminStats, useUpdateTheme } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

const THEME_PRESETS = [
  { id: "default", label: "Naranja", color: "oklch(0.50 0.20 25)" },
  { id: "blue", label: "Azul", color: "oklch(0.50 0.18 250)" },
  { id: "green", label: "Verde", color: "oklch(0.52 0.17 150)" },
  { id: "violet", label: "Violeta", color: "oklch(0.50 0.18 290)" },
  { id: "rose", label: "Rosa", color: "oklch(0.52 0.19 350)" },
  { id: "teal", label: "Turquesa", color: "oklch(0.52 0.13 180)" },
];

export function AdminPage() {
  const { data, isLoading } = useAdminStats();
  const { user } = useAuth();
  const updateTheme = useUpdateTheme();
  const [logoKey, setLogoKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentTheme, setCurrentTheme] = useState(() => user?.theme || "default");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload("/admin/logo", formData);
      setLogoKey((k) => k + 1);
      toast.success("Logo actualizado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el logo");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleThemeChange(themeId: string) {
    // Apply immediately for instant feedback
    setCurrentTheme(themeId);
    if (themeId !== "default") {
      document.documentElement.setAttribute("data-theme", themeId);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }

    // Persist to backend
    updateTheme.mutate(themeId, {
      onSuccess: () => {
        // Update stored user
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          u.theme = themeId;
          localStorage.setItem("user", JSON.stringify(u));
        }
        toast.success("Tema actualizado");
      },
      onError: () => {
        toast.error("Error al guardar el tema");
        // Revert
        const prev = user?.theme || "default";
        setCurrentTheme(prev);
        if (prev !== "default") {
          document.documentElement.setAttribute("data-theme", prev);
        } else {
          document.documentElement.removeAttribute("data-theme");
        }
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">Configuración general de la aplicación</p>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const {
    totalMembers = 0,
    totalDocuments = 0,
    totalActivities = 0,
    totalAlbums = 0,
  } = data || {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Configuración general de la aplicación
        </p>
      </div>

      {/* ── Sección: Configuración ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Configuración</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Gestión de usuarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Crea, edita o desactiva cuentas de acceso a la aplicación.
              </p>
              <Link to="/admin/usuarios">
                <Button variant="outline">Gestionar usuarios</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4" />
                Tu plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Consulta el uso actual de tu organización y los límites de tu plan.
              </p>
              <Link to="/admin/plan">
                <Button variant="outline">Ver tu plan</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Sección: Apariencia ── */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Apariencia</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Theme picker */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Tema de colores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Elige el color principal. Se aplicará a todos los usuarios.
              </p>
              <div className="flex flex-wrap gap-3">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleThemeChange(preset.id)}
                    className="flex flex-col items-center gap-1.5 group"
                    title={preset.label}
                  >
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-background transition-all"
                      style={{
                        backgroundColor: preset.color,
                        ringColor: currentTheme === preset.id ? preset.color : "transparent",
                      }}
                    >
                      {currentTheme === preset.id && (
                        <Check className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Logo upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Logo del sitio
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-lg border flex items-center justify-center overflow-hidden bg-muted shrink-0">
                <img
                  key={logoKey}
                  src={`${API_BASE}/admin/logo?v=${logoKey}`}
                  alt="Logo"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, SVG o WebP, máx. 2MB.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Subiendo..." : "Subir logo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
