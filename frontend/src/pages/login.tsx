import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Download, Building2, Check, Eye, EyeOff } from "lucide-react";
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
import loginIllustration from "@/assets/login-illustration.png";

const FEATURES = [
  "Gestiona cursos y talleres",
  "Comparte documentos",
  "Organiza tu comunidad",
];

export function LoginPage() {
  const navigate = useNavigate();
  const { login, switchTenant, pendingTenants, clearPendingTenants } = useAuth();
  const { canInstall, install } = usePwaInstall();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    } catch {
      setError("Credenciales inválidas. Inténtalo de nuevo.");
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

  // Tenant selector screen
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
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl border shadow-sm overflow-hidden bg-card">
        {/* Left: Branding */}
        <div className="hidden lg:flex flex-col justify-between p-10 bg-muted/30">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{APP_NAME}</span>
            </div>
            <h2 className="text-2xl font-bold leading-tight mb-6">
              La plataforma para<br />gestionar tu comunidad
            </h2>
            <div className="space-y-2">
              {FEATURES.map((f) => (
                <div key={f} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <img
              src={loginIllustration}
              alt="Ilustración"
              className="w-full max-w-sm rounded-xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        </div>

        {/* Right: Login form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary lg:hidden">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">{APP_NAME}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Accede a tu comunidad<br />y gestiona cursos, talleres y documentos
            </p>
          </div>

          {/* Features (mobile only) */}
          <div className="space-y-1.5 mb-6 lg:hidden">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-medium">{f}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </Button>

            <div className="text-center space-y-1">
              <Link to="/recuperar" className="text-sm text-muted-foreground hover:underline block">
                ¿Has olvidado tu <strong>contraseña</strong>?
              </Link>
              <Link to="/registro" className="text-sm text-muted-foreground hover:underline block">
                ¿Aún no tienes cuenta? <span className="text-primary font-medium">Crear comunidad</span>
              </Link>
            </div>
          </form>
        </div>
      </div>

      {canInstall && (
        <div className="fixed bottom-4 left-4 right-4 flex justify-center">
          <Button
            onClick={install}
            variant="outline"
            className="gap-2 shadow-lg bg-background"
          >
            <Download className="h-4 w-4" />
            Instalar aplicación
          </Button>
        </div>
      )}
    </div>
  );
}
