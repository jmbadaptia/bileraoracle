import { useParams, Link } from "react-router";
import {
  Pencil, Phone, Mail, Globe, CalendarDays, User,
} from "lucide-react";
import { useContact } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ContactoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin, user } = useAuth();
  const { data: contact, isLoading } = useContact(id!);

  if (isLoading || !contact) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Contacto no encontrado"}
        </h1>
      </div>
    );
  }

  const canEdit = isAdmin || contact.createdBy === user?.id;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold">{contact.name}</h1>
            {contact.category && (
              <Badge variant="secondary">{contact.category}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Añadido por {contact.createdByName}
          </p>
        </div>
        {canEdit && (
          <Link to={`/contactos/${contact.id}/editar`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact info */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {contact.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
            {contact.web && (
              <div className="flex items-center gap-3 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.web.startsWith("http") ? contact.web : `https://${contact.web}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline truncate"
                >
                  {contact.web}
                </a>
              </div>
            )}
            {!contact.phone && !contact.email && !contact.web && (
              <p className="text-sm text-muted-foreground">Sin datos de contacto.</p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            {contact.notes ? (
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Sin notas.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linked activities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <CalendarDays className="inline h-4 w-4 mr-1.5" />
            Actividades vinculadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!contact.activities || contact.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este contacto no está vinculado a ninguna actividad.
            </p>
          ) : (
            <div className="space-y-2">
              {contact.activities.map((act: any) => (
                <Link
                  key={act.id}
                  to={`/actividades/${act.id}`}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{act.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                      </Badge>
                      {act.role && (
                        <span className="text-xs text-muted-foreground">
                          Rol: {act.role}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <Badge
                      variant="outline"
                      className={
                        act.status === "DONE"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : act.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                      }
                    >
                      {ACTIVITY_STATUS_LABELS[act.status] || act.status}
                    </Badge>
                    {act.startDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDateTime(act.startDate)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
