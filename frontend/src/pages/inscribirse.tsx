import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarDays, MapPin, Users, CheckCircle, Clock, AlertCircle,
  Loader2, Euro, Shuffle, Timer, Mail, Phone, User, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  programText: string | null;
  documents?: Array<{
    id: string;
    title: string;
    fileName: string;
    fileType: string;
    extractedText: string | null;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; desc: string; icon: string; bg: string; text: string; dot: string }> = {
  CONFIRMED: {
    label: "Plaza confirmada",
    desc: "Tienes plaza confirmada. Te hemos enviado un email con todos los detalles.",
    icon: "check", bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", dot: "bg-emerald-500",
  },
  PENDING: {
    label: "Pendiente de sorteo",
    desc: "Tu inscripcion ha sido registrada. Se realizara un sorteo para asignar las plazas y te notificaremos el resultado por email.",
    icon: "clock", bg: "bg-blue-50 border-blue-200", text: "text-blue-700", dot: "bg-blue-500",
  },
  WAITLISTED: {
    label: "Lista de espera",
    desc: "Las plazas estan completas. Estas en lista de espera y te avisaremos por email si se libera alguna plaza.",
    icon: "clock", bg: "bg-amber-50 border-amber-200", text: "text-amber-700", dot: "bg-amber-500",
  },
};

function InfoBadge({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium bg-white/20 text-white/90 backdrop-blur-sm border border-white/10">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function DetailCard({ icon: Icon, iconBg, label, value }: { icon: any; iconBg: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-semibold mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function InscribirsePage() {
  const { activityId } = useParams();
  const [searchParams] = useSearchParams();
  const cancelToken = searchParams.get("cancel");

  const [activity, setActivity] = useState<ActivityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; position: number; cancelToken: string } | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!activityId) return;
    fetch(`${API_BASE}/enrollments/public/${activityId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("No encontrada");
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
      const res = await fetch(`${API_BASE}/enrollments/cancel-by-token?token=${cancelToken}`, { method: "PATCH" });
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

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Error ──
  if (error && !activity) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-lg font-semibold mb-1">No disponible</h2>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!activity) return null;

  const capacityPct = activity.maxCapacity ? Math.min((activity.spotsTaken / activity.maxCapacity) * 100, 100) : 0;
  const spotsRemaining = activity.spotsAvailable ?? 0;

  // ── Cancel flow ──
  if (cancelToken && !cancelled) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E6E1] p-8 text-center space-y-5">
          <AlertCircle className="h-12 w-12 mx-auto text-amber-500" />
          <h2 className="text-xl font-bold">Cancelar inscripcion</h2>
          <p className="text-muted-foreground">
            Estas a punto de cancelar tu inscripcion a <strong>{activity.title}</strong>. Esta accion no se puede deshacer.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 justify-center">
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelando..." : "Confirmar cancelacion"}
            </Button>
            <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
          </div>
        </div>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E6E1] p-8 text-center space-y-4">
          <CheckCircle className="h-14 w-14 mx-auto text-emerald-600" />
          <h2 className="text-xl font-bold">Inscripcion cancelada</h2>
          <p className="text-muted-foreground">Tu inscripcion a <strong>{activity.title}</strong> ha sido cancelada.</p>
        </div>
      </div>
    );
  }

  // ── Success ──
  if (result) {
    const info = STATUS_CONFIG[result.status] || STATUS_CONFIG.CONFIRMED;
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl border border-[#E8E6E1] overflow-hidden">
          <div className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Inscripcion registrada</h2>
          </div>

          <div className={cn("mx-6 rounded-xl border p-5 space-y-2", info.bg)}>
            <div className="flex items-center gap-2">
              <div className={cn("h-2.5 w-2.5 rounded-full", info.dot)} />
              <span className={cn("font-semibold", info.text)}>{info.label}</span>
            </div>
            <p className="text-sm leading-relaxed">{info.desc}</p>
          </div>

          <div className="m-6 rounded-xl bg-[#FAFAF8] p-5 space-y-2">
            <p className="font-semibold">{activity.title}</p>
            {activity.startDate && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date(activity.startDate).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {activity.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {activity.location}
              </p>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center px-6 pb-8">
            Hemos enviado un email de confirmacion. Si necesitas cancelar, usa el enlace del email.
          </p>
        </div>
      </div>
    );
  }

  // ── Main enrollment page ──
  return (
    <div className="min-h-screen bg-[#FAFAF8]" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <div className="max-w-[720px] mx-auto px-4 py-8">

        {/* ── Banner ── */}
        <div className="bg-gradient-to-br from-primary to-primary/80 rounded-t-2xl px-8 py-10 relative overflow-hidden">
          {/* Decorative pattern */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.06]"
            style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 20px, #fff 20px, #fff 22px)" }}
          />

          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60 mb-2">
            {activity.tenantName}
          </p>
          <h1 className="text-3xl font-bold text-white leading-tight mb-2">
            {activity.title}
          </h1>
          {activity.description && (
            <p className="text-white/70 text-[15px] leading-relaxed max-w-xl">
              {activity.description.length > 120 ? "" : activity.description}
            </p>
          )}

          {/* Quick info badges */}
          <div className="flex flex-wrap gap-2 mt-5">
            {activity.startDate && (
              <InfoBadge icon={CalendarDays}>
                {new Date(activity.startDate).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
              </InfoBadge>
            )}
            {activity.location && <InfoBadge icon={MapPin}>{activity.location}</InfoBadge>}
            <InfoBadge icon={Euro}>
              {activity.enrollmentPrice > 0 ? `${activity.enrollmentPrice.toFixed(2)}€` : "Gratuito"}
            </InfoBadge>
          </div>
        </div>

        {/* ── Body card ── */}
        <div className="bg-white border border-[#E8E6E1] border-t-0 rounded-b-2xl">

          {/* Description */}
          {activity.description && activity.description.length > 120 && (
            <div className="px-8 pt-7 pb-0">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-2">
                Sobre este curso
              </h3>
              <p className="text-[15px] text-muted-foreground leading-[1.7]">
                {activity.description}
              </p>
            </div>
          )}

          {/* Details grid */}
          <div className="px-8 py-7">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {activity.startDate && (
                <DetailCard
                  icon={CalendarDays}
                  iconBg="bg-blue-50 text-blue-600"
                  label="Fecha"
                  value={new Date(activity.startDate).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
                />
              )}
              {activity.startDate && (
                <DetailCard
                  icon={Clock}
                  iconBg="bg-violet-50 text-violet-600"
                  label="Hora"
                  value={`${new Date(activity.startDate).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}h`}
                />
              )}
              {activity.location && (
                <DetailCard
                  icon={MapPin}
                  iconBg="bg-rose-50 text-rose-600"
                  label="Lugar"
                  value={activity.location}
                />
              )}
              <DetailCard
                icon={Euro}
                iconBg="bg-emerald-50 text-emerald-600"
                label="Precio"
                value={activity.enrollmentPrice > 0 ? `${activity.enrollmentPrice.toFixed(2)}€` : "Gratuito"}
              />
              <DetailCard
                icon={Shuffle}
                iconBg="bg-amber-50 text-amber-600"
                label="Plazas"
                value={activity.enrollmentMode === "LOTTERY" ? "Por sorteo" : "Orden de llegada"}
              />
              {activity.enrollmentDeadline && (
                <DetailCard
                  icon={Timer}
                  iconBg="bg-orange-50 text-orange-600"
                  label="Plazo"
                  value={`Hasta ${new Date(activity.enrollmentDeadline).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`}
                />
              )}
            </div>
          </div>

          {/* Program section */}
          {(() => {
            const docWithText = activity.documents?.find(d => d.extractedText);
            const text = docWithText?.extractedText || activity.programText;
            if (!text) return null;
            return (
              <div className="px-8 pb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground mb-3">
                  Programa
                </h3>
                <div className="text-[15px] text-muted-foreground leading-[1.7] whitespace-pre-line">
                  {text}
                </div>
                {activity.documents?.filter(d => d.fileType?.includes("pdf") || d.fileType?.includes("word") || d.fileType?.includes("document")).map(d => (
                  <a
                    key={d.id}
                    href={`${API_BASE}/enrollments/public/${activity.id}/documents/${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-4 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Descargar programa completo
                  </a>
                ))}
              </div>
            );
          })()}

          {/* Spots indicator */}
          {activity.maxCapacity && (
            <div className="px-8 pb-7">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[#F0EEEA] rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      capacityPct >= 90 ? "bg-red-500" : capacityPct >= 70 ? "bg-amber-500" : "bg-primary"
                    )}
                    style={{ width: `${capacityPct}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[13px] font-semibold whitespace-nowrap",
                  spotsRemaining <= 2 && spotsRemaining > 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {spotsRemaining <= 0
                    ? "Completo"
                    : spotsRemaining <= 2
                    ? `Solo ${spotsRemaining} ${spotsRemaining === 1 ? "plaza" : "plazas"}!`
                    : `${activity.spotsTaken}/${activity.maxCapacity} plazas`
                  }
                </span>
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-[#E8E6E1] mx-8" />

          {/* ── Form or closed ── */}
          <div className="px-8 py-7">
            {!activity.isOpen ? (
              <div className="text-center py-6">
                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-semibold text-lg">Inscripciones cerradas</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {activity.maxCapacity && spotsRemaining <= 0
                    ? "Se han agotado todas las plazas."
                    : "El plazo de inscripcion ha finalizado."
                  }
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-5">Inscribete</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label className="text-[13px] font-semibold mb-1.5 block">
                      Nombre completo <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Tu nombre y apellidos"
                        className="pl-10 h-11 rounded-xl bg-[#FAFAF8] border-[#E8E6E1] focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="text-[13px] font-semibold mb-1.5 block">
                        Email <span className="text-primary">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          className="pl-10 h-11 rounded-xl bg-[#FAFAF8] border-[#E8E6E1] focus:bg-white"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[13px] font-semibold mb-1.5 block">Telefono</Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="600 000 000"
                          className="pl-10 h-11 rounded-xl bg-[#FAFAF8] border-[#E8E6E1] focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}

                  <Button
                    type="submit"
                    className="w-full h-12 text-[15px] font-semibold rounded-xl mt-1"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Inscribiendo..."
                      : activity.enrollmentPrice > 0
                      ? `Inscribirme — ${activity.enrollmentPrice.toFixed(2)}€`
                      : "Inscribirme"
                    }
                  </Button>

                  {activity.enrollmentMode === "LOTTERY" && (
                    <p className="text-xs text-muted-foreground text-center">
                      Las plazas se asignaran por sorteo. Recibiras el resultado por email.
                    </p>
                  )}

                  <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed">
                    Al inscribirte aceptas los terminos y condiciones de {activity.tenantName}.
                    <br />Recibiras un email de confirmacion con los detalles.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground/60 mt-5 pb-4">
          Gestionado con <span className="font-semibold text-muted-foreground/80">Bilera</span>
        </p>
      </div>
    </div>
  );
}
