import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Phone, Mail, Globe, Trash2, Contact } from "lucide-react";
import { toast } from "sonner";
import { useContacts, useDeleteContact, useContactCategories } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function ContactosPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (search) params.q = search;
  if (category) params.category = category;

  const { data, isLoading } = useContacts(params);
  const { data: categories = [] } = useContactCategories();
  const deleteContact = useDeleteContact();

  const contacts = data?.contacts || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">
            Personas y organizaciones externas
          </p>
        </div>
        <Link to="/contactos/nuevo">

          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[160px]"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Results */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Contact className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || category
              ? "No se encontraron colaboradores con esos filtros"
              : "No hay colaboradores todavía"}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {contacts.length} colaborador{contacts.length !== 1 ? "es" : ""}
          </p>
          <div className="rounded-lg border divide-y">
            {contacts.map((contact: any) => (
              <Link
                key={contact.id}
                to={`/contactos/${contact.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {contact.name}
                    </h3>
                    {contact.category && (
                      <Badge variant="secondary" className="text-[11px] shrink-0">
                        {contact.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                    {contact.web && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {contact.web}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-destructive/10 text-destructive transition-opacity shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteId(contact.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar contacto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que quieres eliminar este contacto? Se desvinculará de todas las actividades.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteContact.isPending}
              onClick={() => {
                if (!deleteId) return;
                deleteContact.mutate(deleteId, {
                  onSuccess: () => {
                    toast.success("Contacto eliminado");
                    setDeleteId(null);
                  },
                  onError: () => toast.error("Error al eliminar"),
                });
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
