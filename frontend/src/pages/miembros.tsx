import { Link } from "react-router";
import { Plus, UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMembers } from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function MiembrosPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading } = useMembers({ active: "true", limit: "100" });

  const members = data?.members || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          <p className="text-muted-foreground">
            {members.length} miembros registrados
          </p>
        </div>
        {isAdmin && (
          <Link to="/miembros/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Miembro
            </Button>
          </Link>
        )}
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay miembros registrados.
            </p>
            {isAdmin && (
              <Link to="/miembros/nuevo" className="mt-4">
                <Button variant="outline">Crear primer miembro</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member: any) => {
            const initials = member.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2);

            return (
              <Link key={member.id} to={`/miembros/${member.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {member.name}
                          </h3>
                          {!member.active && (
                            <Badge variant="secondary" className="text-xs">
                              Inactivo
                            </Badge>
                          )}
                        </div>
                        {member.position && (
                          <p className="text-sm text-muted-foreground truncate">
                            {member.position}
                          </p>
                        )}
                        {member.party && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {member.party}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {member._count?.activitiesOwned ?? 0} actividades
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
