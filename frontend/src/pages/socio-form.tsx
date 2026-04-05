import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useSocio, useCreateSocio, useUpdateSocio } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SocioFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing } = useSocio(id || "");
  const createSocio = useCreateSocio();
  const updateSocio = useUpdateSocio(id || "");

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [numeroSocio, setNumeroSocio] = useState("");
  const [fechaAlta, setFechaAlta] = useState("");
  const [estado, setEstado] = useState("ACTIVO");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (existing) {
      setNombre(existing.nombre || "");
      setApellidos(existing.apellidos || "");
      setDni(existing.dni || "");
      setEmail(existing.email || "");
      setTelefono(existing.telefono || "");
      setDireccion(existing.direccion || "");
      setNumeroSocio(existing.numeroSocio || "");
      setFechaAlta(existing.fechaAlta ? new Date(existing.fechaAlta).toISOString().slice(0, 10) : "");
      setEstado(existing.estado || "ACTIVO");
      setNotas(existing.notas || "");
    }
  }, [existing]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { toast.error("El nombre es obligatorio"); return; }

    const data = {
      nombre: nombre.trim(),
      apellidos: apellidos.trim() || undefined,
      dni: dni.trim() || undefined,
      email: email.trim() || undefined,
      telefono: telefono.trim() || undefined,
      direccion: direccion.trim() || undefined,
      numeroSocio: numeroSocio.trim() || undefined,
      fechaAlta: fechaAlta || undefined,
      estado,
      notas: notas.trim() || undefined,
    };

    try {
      if (isEdit) {
        await updateSocio.mutateAsync(data);
        toast.success("Socio actualizado");
      } else {
        await createSocio.mutateAsync(data);
        toast.success("Socio registrado");
      }
      navigate("/socios");
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar socio" : "Registrar socio"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Modifica los datos del socio" : "Añade un nuevo miembro a la organización"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={createSocio.isPending || updateSocio.isPending}>
            {isEdit ? "Guardar cambios" : "Registrar socio"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Información personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos</Label>
                  <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Apellidos" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>DNI / NIF</Label>
                  <Input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678A" />
                </div>
                <div className="space-y-2">
                  <Label>Nº de socio</Label>
                  <Input value={numeroSocio} onChange={(e) => setNumeroSocio(e.target.value)} placeholder="001" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="socio@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600 000 000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, ciudad..." />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Información interna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 flex-1 flex flex-col">
              <div className="space-y-2">
                <Label>Fecha de alta</Label>
                <Input type="date" value={fechaAlta} onChange={(e) => setFechaAlta(e.target.value)} />
              </div>
              {isEdit && (
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <select value={estado} onChange={(e) => setEstado(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                    <option value="ACTIVO">Activo</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
              )}
              <div className="space-y-2 flex-1 flex flex-col">
                <Label>Notas</Label>
                <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Observaciones..." className="flex-1 min-h-[80px]" />
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
