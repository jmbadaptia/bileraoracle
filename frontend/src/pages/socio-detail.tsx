import { useParams, Link } from "react-router";
import { Mail, Phone, MapPin, Hash, Calendar, FileText, Pencil } from "lucide-react";
import { useSocio } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function SocioDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { data: socio, isLoading } = useSocio(id || "");

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Card><CardContent className="pt-6 space-y-3"><Skeleton className="h-5 w-64" /><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card>
      </div>
    );
  }

  if (!socio) {
    return <div className="text-center py-16 text-muted-foreground">Socio no encontrado</div>;
  }

  const fullName = [socio.nombre, socio.apellidos].filter(Boolean).join(" ");

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{fullName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={socio.estado === "ACTIVO" ? "default" : "secondary"}>
              {socio.estado === "ACTIVO" ? "Activo" : "Baja"}
            </Badge>
            {socio.numeroSocio && (
              <span className="text-sm text-muted-foreground">Nº {socio.numeroSocio}</span>
            )}
          </div>
          {socio.creatorName && (
            <p className="text-xs text-muted-foreground mt-1">Registrado por {socio.creatorName}</p>
          )}
        </div>
        {isAdmin && (
          <Link to={`/socios/${id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          </Link>
        )}
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Datos personales</h3>
            {socio.dni && (
              <div className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{socio.dni}</span>
              </div>
            )}
            {socio.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`mailto:${socio.email}`} className="text-primary hover:underline">{socio.email}</a>
              </div>
            )}
            {socio.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a href={`tel:${socio.telefono}`} className="hover:underline">{socio.telefono}</a>
              </div>
            )}
            {socio.direccion && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{socio.direccion}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Membresía</h3>
            {socio.fechaAlta && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>Alta: {new Date(socio.fechaAlta).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
            {socio.fechaBaja && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-destructive shrink-0" />
                <span>Baja: {new Date(socio.fechaBaja).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notas */}
      {socio.notas && (
        <Card>
          <CardContent className="pt-5 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Notas
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{socio.notas}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
