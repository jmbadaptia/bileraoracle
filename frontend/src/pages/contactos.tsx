import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Phone, Mail, Globe, Trash2 } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contactos</h1>
          <p className="text-sm text-muted-foreground">
            Personas y organizaciones externas
          </p>
        </div>
        <Link to="/contactos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo contacto
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map((cat: string) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Contact list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search || category
              ? "No se encontraron contactos con esos filtros"
              : "No hay contactos todavía"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact: any) => (
            <Link
              key={contact.id}
              to={`/contactos/${contact.id}`}
              className="group block rounded-lg border p-4 hover:bg-muted/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{contact.name}</p>
                  {contact.category && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {contact.category}
                    </Badge>
                  )}
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteId(contact.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="mt-3 space-y-1">
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="truncate">{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.web && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Globe className="h-3.5 w-3.5" />
                    <span className="truncate">{contact.web}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
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
