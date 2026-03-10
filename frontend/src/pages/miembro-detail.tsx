import { useParams, Link } from "react-router";
import { Pencil, Mail, Phone, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMember } from "@/api/hooks";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function MiembroDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: member, isLoading } = useMember(id!);

  if (isLoading || !member) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Miembro no encontrado"}
        </h1>
      </div>
    );
  }

  const initials = member.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{member.name}</h1>
              {!member.active && <Badge variant="secondary">Inactivo</Badge>}
            </div>
            {member.position && (
              <p className="text-muted-foreground">{member.position}</p>
            )}
            {member.party && (
              <p className="text-sm text-muted-foreground">{member.party}</p>
            )}
          </div>
        </div>
        {isAdmin && (
          <Link to={`/miembros/${member.id}/editar`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {member.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.email}`} className="hover:underline">
                  {member.email}
                </a>
              </div>
            )}
            {member.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${member.phone}`} className="hover:underline">
                  {member.phone}
                </a>
              </div>
            )}
            {!member.email && !member.phone && (
              <p className="text-sm text-muted-foreground">
                Sin datos de contacto.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estadisticas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Actividades propias</span>
              <span className="font-medium">
                {member._count?.activitiesOwned ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Asistencias a actividades
              </span>
              <span className="font-medium">
                {member._count?.activitiesAttended ?? 0}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Bio */}
        {member.bio && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Biografia</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{member.bio}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Actividades Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!member.activitiesOwned || member.activitiesOwned.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay actividades registradas para este miembro.
            </p>
          ) : (
            <div className="space-y-2">
              {member.activitiesOwned.map((activity: any) => (
                <Link
                  key={activity.id}
                  to={`/actividades/${activity.id}`}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(activity.date)}
                      {activity.location && ` - ${activity.location}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {ACTIVITY_TYPE_LABELS[activity.type]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
