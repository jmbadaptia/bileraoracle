import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Upload, Check, Palette, Users, PartyPopper, ImageIcon, Plus, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useUpdateTheme, useCompleteSetup, useCreateMember } from "@/api/hooks";
import { api } from "@/lib/api-client";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

const STEPS = [
  { icon: ImageIcon, label: "Logo" },
  { icon: Palette, label: "Tema" },
  { icon: Users, label: "Equipo" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateTheme = useUpdateTheme();
  const completeSetup = useCompleteSetup();
  const createMember = useCreateMember();

  const [step, setStep] = useState(0);
  const [logoKey, setLogoKey] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(user?.theme || "default");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitedList, setInvitedList] = useState<{ name: string; email: string }[]>([]);
  const [inviting, setInviting] = useState(false);
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
      toast.success("Logo subido");
    } catch (err: any) {
      toast.error(err?.message || "Error al subir el logo");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleThemeChange(themeId: string) {
    setCurrentTheme(themeId);
    if (themeId !== "default") {
      document.documentElement.setAttribute("data-theme", themeId);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    updateTheme.mutate(themeId, {
      onSuccess: () => {
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          u.theme = themeId;
          localStorage.setItem("user", JSON.stringify(u));
        }
      },
    });
  }

  async function handleInvite() {
    if (!inviteEmail || !inviteName) return;
    setInviting(true);
    try {
      await createMember.mutateAsync({ name: inviteName, email: inviteEmail });
      setInvitedList((prev) => [...prev, { name: inviteName, email: inviteEmail }]);
      setInviteEmail("");
      setInviteName("");
      toast.success(`Invitación enviada a ${inviteEmail}`);
    } catch (err: any) {
      toast.error(err?.message || "Error al invitar");
    }
    setInviting(false);
  }

  async function handleComplete() {
    try {
      await completeSetup.mutateAsync();
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        u.setupComplete = true;
        localStorage.setItem("user", JSON.stringify(u));
      }
      navigate("/", { replace: true });
    } catch {
      toast.error("Error al completar la configuración");
    }
  }

  function handleSkip() {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Configura {user?.tenantName || APP_NAME}</h1>
          <p className="text-muted-foreground mt-2 text-base">Personaliza tu espacio en unos pocos pasos</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <div className={cn("h-px w-12", isDone ? "bg-primary" : "bg-border")} />}
                <div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                    isActive && "bg-primary text-primary-foreground",
                    isDone && "bg-primary/10 text-primary",
                    !isActive && !isDone && "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  {s.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="rounded-xl border bg-card p-8 md:p-12">
          {/* Step 0: Logo */}
          {step === 0 && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-xl font-semibold">Sube el logo de tu organización</h2>
                <p className="text-muted-foreground mt-2">
                  Aparecerá en el menú lateral y en la página de acceso. Puedes cambiarlo después en Configuración.
                </p>
              </div>
              <div className="flex flex-col items-center gap-6">
                <div className="h-32 w-32 rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted">
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
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="lg"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Subiendo..." : "Elegir imagen"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Theme */}
          {step === 1 && (
            <div className="space-y-6 text-center">
              <div>
                <h2 className="text-xl font-semibold">Elige un color para tu espacio</h2>
                <p className="text-muted-foreground mt-2">
                  Define el color principal de la aplicación. Se aplicará a todos los miembros.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-6 pt-4">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleThemeChange(preset.id)}
                    className="flex flex-col items-center gap-3 group"
                  >
                    <div
                      className="h-16 w-16 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-background transition-all"
                      style={{
                        backgroundColor: preset.color,
                        outlineColor: currentTheme === preset.id ? preset.color : "transparent",
                      }}
                    >
                      {currentTheme === preset.id && (
                        <Check className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Invite */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold">Invita a tu equipo</h2>
                <p className="text-muted-foreground mt-2">
                  Envía invitaciones por email. Recibirán un enlace para crear su cuenta.
                </p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
                  <div>
                    <Label htmlFor="inviteName" className="sr-only">Nombre</Label>
                    <Input
                      id="inviteName"
                      placeholder="Nombre"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="inviteEmail" className="sr-only">Email</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      placeholder="email@ejemplo.es"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleInvite();
                        }
                      }}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={inviting || !inviteEmail || !inviteName}
                    onClick={handleInvite}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {invitedList.length > 0 && (
                  <div className="space-y-2">
                    {invitedList.map((inv, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted text-sm"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium">{inv.name}</span>
                        <span className="text-muted-foreground">{inv.email}</span>
                        <Check className="h-4 w-4 text-green-600 ml-auto shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-8 mt-8 border-t">
            <Button variant="ghost" onClick={handleSkip}>
              {step < 2 ? "Saltar" : "Saltar todo"}
            </Button>
            <div className="flex gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)}>
                  Atrás
                </Button>
              )}
              {step < 2 ? (
                <Button onClick={() => setStep(step + 1)}>
                  Siguiente
                </Button>
              ) : (
                <Button onClick={handleComplete} disabled={completeSetup.isPending}>
                  <PartyPopper className="mr-2 h-4 w-4" />
                  {completeSetup.isPending ? "Guardando..." : "Empezar"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
