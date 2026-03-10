import { useState, useRef } from "react";
import { Link } from "react-router";
import { Users, FileText, Database, Upload, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAdminStats } from "@/api/hooks";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

export function AdminPage() {
  const { data, isLoading } = useAdminStats();
  const [logoKey, setLogoKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  const {
    totalUsers = 0,
    totalDocuments = 0,
    totalActivities = 0,
  } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
        <p className="text-muted-foreground">
          Panel de administración del sistema
        </p>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDocuments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actividades</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivities}</div>
          </CardContent>
        </Card>
      </div>

      {/* Logo upload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Logo del sitio
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-lg border flex items-center justify-center overflow-hidden bg-muted">
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
              Sube un logo (PNG, JPG, SVG o WebP, máx. 2MB). Aparecerá en el sidebar y en la página de login.
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3 flex-wrap">
          <Link to="/admin/usuarios">
            <Button variant="outline">Gestionar Equipo</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
