import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, UsersRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useGroups, useDeleteGroup } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

export function GruposPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (search) params.search = search;

  const { data, isLoading } = useGroups(params);
  const deleteGroup = useDeleteGroup();

  const groups = data?.groups || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grupos</h1>
          <p className="text-sm text-muted-foreground">
            Comisiones y grupos de trabajo
          </p>
        </div>
        {isAdmin && (
          <Link to="/grupos/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo grupo
            </Button>
          </Link>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersRound className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron grupos" : "No hay grupos todavia"}
            </p>
            {!search && isAdmin && (
              <Link to="/grupos/nuevo" className="mt-4">
                <Button variant="outline">Crear primer grupo</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group: any) => (
            <Link
              key={group.id}
              to={`/grupos/${group.id}`}
              className="group block"
            >
              <Card className="h-full hover:bg-muted/50 hover:shadow-sm transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <UsersRound className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold truncate">{group.name}</h3>
                      </div>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {group.description}
                        </p>
                      )}
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {group.memberCount || 0} miembro{(group.memberCount || 0) !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive transition-opacity shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteId(group.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar grupo</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estas seguro de que quieres eliminar este grupo? Los miembros no seran eliminados.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteGroup.isPending}
              onClick={() => {
                if (!deleteId) return;
                deleteGroup.mutate(deleteId, {
                  onSuccess: () => {
                    toast.success("Grupo eliminado");
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
