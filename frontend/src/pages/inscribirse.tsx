import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Users, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

interface ActivityInfo {
  id: string;
  title: string;
  description: string | null;
  startDate: string | null;
  location: string | null;
  type: string;
  tenantName: string;
  enrollmentMode: string;
  maxCapacity: number | null;
  enrollmentPrice: number;
  enrollmentDeadline: string | null;
  spotsTaken: number;
  spotsAvailable: number | null;
  isOpen: boolean;
}

const STATUS_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  CONFIRMED: { label: "Confirmada", desc: "Tienes plaza confirmada.", color: "text-emerald-600" },
  PENDING: { label: "Pendiente de sorteo", desc: "Tu inscripción ha sido registrada. Se realizará un sorteo para asignar las plazas.", color: "text-blue-600" },
  WAITLISTED: { label: "Lista de espera", desc: "Las plazas están completas. Te avisaremos si se libera alguna.", color: "text-amber-600" },
};

export function InscribirsePage() {
  const { activityId } = useParams();
  const [searchParams] = useSearchParams();
  const cancelToken = searchParams.get("cancel");

  const [activity, setActivity] = useState<ActivityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; position: number; cancelToken: string } | null>(null);

  // Cancel state
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!activityId) return;
    fetch(`${API_BASE}/enrollments/public/${activityId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Actividad no encontrada");
        return res.json();
      })
      .then(setActivity)
      .catch(() => setError("Actividad no encontrada o sin inscripciones abiertas"))
      .finally(() => setLoading(false));
  }, [activityId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/enrollments/${activityId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al inscribirse");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  }

  async function handleCancel() {
    if (!cancelToken) return;
    setCancelling(true);
    try {
      // We need the enrollment ID — extract from URL or use token-based cancel
      // The cancel endpoint uses enrollment ID + token, but from the public link we only have the token
      // We'll search by token
      const res = await fetch(`${API_BASE}/enrollments/cancel-by-token?token=${cancelToken}`, {
        method: "PATCH",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al cancelar");
      }
      setCancelled(true);
    } catch (err: any) {
      setError(err.message);
    }
    setCancelling(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !activity) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activity) return null;

  // Cancel flow
  if (cancelToken && !cancelled) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-xl font-bold">Cancelar inscripción</h2>
            <p className="text-muted-foreground">
              ¿Seguro que quieres cancelar tu inscripción a <strong>{activity.title}</strong>?
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? "Cancelando..." : "Sí, cancelar"}
              </Button>
              <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 mx-auto text-emerald-600" />
            <h2 className="text-xl font-bold">Inscripción cancelada</h2>
            <p className="text-muted-foreground">Tu inscripción a {activity.title} ha sido cancelada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success result
  if (result) {
    const info = STATUS_LABELS[result.status] || { label: result.status, desc: "", color: "" };
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-emerald-600" />
              <h2 className="text-xl font-bold">Inscripción registrada</h2>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm"><strong>Actividad:</strong> {activity.title}</p>
              <p className="text-sm">
                <strong>Estado:</strong>{" "}
                <span className={info.color}>{info.label}</span>
              </p>
              <p className="text-sm text-muted-foreground">{info.desc}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Hemos enviado un email de confirmación. Si necesitas cancelar, usa el enlace del email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Enrollment form
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-5">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{activity.tenantName}</p>
            <h1 className="text-xl font-bold">{activity.title}</h1>
            {activity.description && (
              <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {activity.startDate && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(activity.startDate).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {activity.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {activity.location}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {activity.maxCapacity && (
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {activity.spotsTaken}/{activity.maxCapacity} plazas
              </Badge>
            )}
            {activity.enrollmentPrice > 0 && (
              <Badge variant="outline">{activity.enrollmentPrice.toFixed(2)}€</Badge>
            )}
            {activity.enrollmentMode === "LOTTERY" && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                Sorteo
              </Badge>
            )}
          </div>

          {!activity.isOpen ? (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
              <p className="font-medium">Inscripciones cerradas</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Inscribiendo..." : "Inscribirme"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
