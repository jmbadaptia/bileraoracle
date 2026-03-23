import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Download, Building2 } from "lucide-react";
import { usePwaInstall } from "@/lib/use-pwa-install";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;
import { useAuth, type Tenant } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, switchTenant, pendingTenants, clearPendingTenants } = useAuth();
  const { canInstall, install } = usePwaInstall();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const canNavigate = await login(email, password);
      if (canNavigate) navigate("/");
      // If false, pendingTenants is set and tenant selector will render
    } catch {
      setError("Credenciales invalidas. Intentalo de nuevo.");
    }
    setLoading(false);
  }

  async function handleSelectTenant(tenant: Tenant) {
    setLoading(true);
    setError("");
    try {
      await switchTenant(tenant.id);
      navigate("/");
    } catch {
      setError("Error al seleccionar la organización.");
    }
    setLoading(false);
  }

  // Tenant selector screen (after login, if multiple tenants)
  if (pendingTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Selecciona organización</CardTitle>
            <CardDescription>
              Perteneces a varias organizaciones. Elige con cuál quieres trabajar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left disabled:opacity-50"
              >
                <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tenant.role === "ADMIN" ? "Administrador" : "Miembro"}
                  </p>
                </div>
              </button>
            ))}
            {error && (
              <p className="text-sm text-destructive text-center pt-2">{error}</p>
            )}
            <Button
              variant="ghost"
              className="w-full mt-2"
              onClick={() => {
                clearPendingTenants();
                navigate("/");
              }}
            >
              Continuar con la actual
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary overflow-hidden">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>
            Inicia sesion para acceder al panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@bilera.es"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesion..." : "Iniciar sesion"}
            </Button>
            <div className="text-center space-y-1">
              <Link to="/recuperar" className="text-sm text-muted-foreground hover:underline block">
                ¿Has olvidado tu contraseña?
              </Link>
              <Link to="/registro" className="text-sm text-muted-foreground hover:underline block">
                ¿No tienes cuenta? Regístrate
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
      {canInstall && (
        <div className="fixed bottom-4 left-4 right-4 flex justify-center">
          <Button
            onClick={install}
            variant="outline"
            className="gap-2 shadow-lg bg-background"
          >
            <Download className="h-4 w-4" />
            Instalar aplicacion
          </Button>
        </div>
      )}
    </div>
  );
}
