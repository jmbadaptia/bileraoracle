import { useState } from "react";
import { Link } from "react-router";
import { CheckCircle, UsersRound, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

const FEATURES = [
  "Crear talleres y cursos",
  "Compartir documentos",
  "Gestionar tu comunidad",
];

export function RegistroPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const orgName = fd.get("orgName") as string;
    const name = fd.get("name") as string;
    const email = fd.get("email") as string;

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgName, name, email }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Error al crear la cuenta");
      }
    } catch {
      setError("Error de conexión. Inténtalo de nuevo más tarde.");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <CheckCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Cuenta creada</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Hemos enviado un email de activación a tu correo. Haz clic en el enlace para establecer tu contraseña y empezar a usar {APP_NAME}.
            </p>
            <p className="text-sm text-muted-foreground">
              El enlace es válido durante 7 días.
            </p>
            <Link to="/login">
              <Button variant="outline" className="mt-2">Volver al login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary">
            <UsersRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Crear comunidad</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Gestiona cursos, talleres y documentos en un solo lugar
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5 mb-6">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="font-medium">{f}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nombre de la comunidad</Label>
              <Input
                id="orgName"
                name="orgName"
                required
                placeholder="Ej: Club de montaña, Asociación vecinal..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Tu email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creando..." : "Crear cuenta"}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:underline">
                ¿Ya tienes cuenta? Inicia sesión
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
