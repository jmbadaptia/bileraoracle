import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
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

export function VerificarPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "set-password" | "already-active" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [userName, setUserName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No se proporcionó un token de verificación.");
      return;
    }

    fetch(`${API_BASE}/auth/verify?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setUserName(data.name || "");
          if (data.alreadyActive) {
            setStatus("already-active");
          } else {
            setStatus("set-password");
          }
        } else {
          setStatus("error");
          setMessage(data.error || "Error al verificar la cuenta.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Error de conexión. Inténtalo de nuevo más tarde.");
      });
  }, [token]);

  async function handleActivate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Cuenta activada correctamente.");
      } else {
        setMessage(data.error || "Error al activar la cuenta.");
      }
    } catch {
      setMessage("Error de conexión. Inténtalo de nuevo más tarde.");
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">{APP_NAME}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Verificando...</p>
            </>
          )}

          {status === "set-password" && (
            <div className="text-left">
              <p className="text-center mb-4">
                Hola <strong>{userName}</strong>, elige una contraseña para activar tu cuenta.
              </p>
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
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
                    placeholder="Repite la contraseña"
                  />
                </div>

                {message && (
                  <p className="text-sm text-destructive text-center">{message}</p>
                )}

                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Activando..." : "Activar cuenta"}
                </Button>
              </form>
            </div>
          )}

          {status === "already-active" && (
            <>
              <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-medium">Tu cuenta ya está activa.</p>
              <Link to="/login">
                <Button className="w-full mt-2">Ir al login</Button>
              </Link>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-medium">{message}</p>
              <p className="text-sm text-muted-foreground">
                Ya puedes iniciar sesión con tu email y contraseña.
              </p>
              <Link to="/login">
                <Button className="w-full mt-2">Ir al login</Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-10 w-10 text-destructive mx-auto" />
              <p className="font-medium text-destructive">{message}</p>
              <p className="text-sm text-muted-foreground">
                Si el enlace ha expirado, contacta con un administrador para que te reenvíe la invitación.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
