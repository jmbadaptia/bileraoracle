import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useContact, useCreateContact, useUpdateContact } from "@/api/hooks";
import { CONTACT_CATEGORY_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ContactoFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: existing } = useContact(id || "");
  const createContact = useCreateContact();
  const updateContact = useUpdateContact(id || "");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (existing && isEdit) {
      setName(existing.name || "");
      setPhone(existing.phone || "");
      setEmail(existing.email || "");
      setWeb(existing.web || "");
      setNotes(existing.notes || "");
      if (existing.category) {
        if (CONTACT_CATEGORY_OPTIONS.includes(existing.category)) {
          setCategory(existing.category);
        } else {
          setCategory("_custom");
          setCustomCategory(existing.category);
        }
      }
    }
  }, [existing, isEdit]);

  const resolvedCategory = category === "_custom" ? customCategory.trim() : category;

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    const data = {
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      web: web.trim() || undefined,
      category: resolvedCategory || undefined,
      notes: notes.trim() || undefined,
    };

    if (isEdit) {
      updateContact.mutate(data, {
        onSuccess: () => {
          toast.success("Colaborador actualizado");
          navigate(`/contactos/${id}`);
        },
        onError: () => toast.error("Error al actualizar"),
      });
    } else {
      createContact.mutate(data, {
        onSuccess: (res: any) => {
          toast.success("Colaborador creado");
          navigate(`/contactos/${res.id}`);
        },
        onError: () => toast.error("Error al crear"),
      });
    }
  }

  const isPending = createContact.isPending || updateContact.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? "Editar colaborador" : "Nuevo colaborador"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isEdit ? "Modifica los datos del colaborador" : "Añade una persona o entidad externa"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button onClick={() => handleSubmit()} disabled={isPending}>
            {isPending ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear colaborador"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Datos principales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nombre completo o entidad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sin categoría</option>
                  {CONTACT_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="_custom">Otra (personalizada)</option>
                </select>
                {category === "_custom" && (
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Escribe la categoría..."
                    className="mt-2"
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="web">Web</Label>
                <Input
                  id="web"
                  value={web}
                  onChange={(e) => setWeb(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-base">Notas</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional..."
                className="flex-1 min-h-[80px]"
              />
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
