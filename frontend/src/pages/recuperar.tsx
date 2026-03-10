import { useState } from "react";
import { useSearchParams, Link } from "react-router";
import { Shield, CheckCircle, XCircle } from "lucide-react";
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

/** Step 1: ask for email. Step 2: set new password (if token present). */
export function RecuperarPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
        </CardHeader>
        <CardContent>
          {token ? <ResetForm token={token} /> : <ForgotForm />}
        </CardContent>
      </Card>
    </div>
  );
}

function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;

    await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
        <p className="font-medium">Email enviado</p>
        <p className="text-sm text-muted-foreground">
          Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña. El enlace es válido durante 15 minutos.
        </p>
        <Link to="/login">
          <Button variant="outline" className="mt-2">Volver al login</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@email.com"
        />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : "Enviar enlace"}
      </Button>
      <div className="text-center">
        <Link to="/login" className="text-sm text-muted-foreground hover:underline">
          Volver al login
        </Link>
      </div>
    </form>
  );
}

function ResetForm({ token }: { token: string }) {
  const [status, setStatus] = useState<"form" | "success" | "error">("form");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirmPassword = fd.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
      } else {
        setError(data.error || "Error al restablecer la contraseña.");
      }
    } catch {
      setError("Error de conexión.");
    }
    setLoading(false);
  }

  if (status === "success") {
    return (
      <div className="text-center space-y-4">
        <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
        <p className="font-medium">Contraseña restablecida</p>
        <p className="text-sm text-muted-foreground">
          Ya puedes iniciar sesión con tu nueva contraseña.
        </p>
        <Link to="/login">
          <Button className="w-full mt-2">Ir al login</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted-foreground text-center">
        Elige tu nueva contraseña.
      </p>
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={6}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Guardando..." : "Restablecer contraseña"}
      </Button>
    </form>
  );
}
