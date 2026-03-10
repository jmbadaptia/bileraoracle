import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Shield, Download } from "lucide-react";
import { usePwaInstall } from "@/lib/use-pwa-install";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;
import { useAuth } from "@/lib/auth";
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
  const { login } = useAuth();
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
      await login(email, password);
      navigate("/");
    } catch {
      setError("Credenciales invalidas. Intentalo de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary overflow-hidden">
            {logoError ? (
              <Shield className="h-6 w-6 text-primary-foreground" />
            ) : (
              <img
                src={`${API_BASE}/admin/logo`}
                alt="Logo"
                className="h-full w-full object-contain"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
          <CardDescription>
            Inicia sesion para acceder al panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electronico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@gestionmunicipal.es"
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
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
            <div className="text-center">
              <Link to="/recuperar" className="text-sm text-muted-foreground hover:underline">
                ¿Olvidaste tu contraseña?
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
