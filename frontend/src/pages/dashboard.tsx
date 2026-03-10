import { Link } from "react-router";
import { Users, CalendarDays, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboardStats } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS, SESSION_TYPE_LABELS } from "@/lib/constants";

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  const {
    totalMembers = 0,
    activitiesThisMonth = 0,
    totalDocuments = 0,
    upcomingActivities = [],
    recentActivities = [],
    recentDocuments = [],
  } = data || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.name}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 min-w-0">
        {isAdmin ? (
          <Link to="/admin/usuarios">
            <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Miembros Activos
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMembers}</div>
              </CardContent>
            </Card>
          </Link>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Miembros Activos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
            </CardContent>
          </Card>
        )}

        <Link to="/actividades">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Actividades del Mes
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activitiesThisMonth}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/documentos">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documentos
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/actividades">
          <Card className="h-full transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Proximos Eventos
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {upcomingActivities.length}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2 min-w-0 overflow-hidden">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actividades Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay actividades registradas.
              </p>
            ) : (
              <div className="space-y-3">
                {recentActivities.map((activity: any) => (
                  <Link
                    key={activity.id}
                    to={`/actividades/${activity.id}`}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.member?.name} &middot;{" "}
                        {formatDate(activity.date)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ACTIVITY_TYPE_LABELS[activity.type]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Documentos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay documentos subidos.
              </p>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc: any) => (
                  <Link
                    key={doc.id}
                    to={`/documentos/${doc.id}`}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.uploadedBy?.name} &middot;{" "}
                        {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 whitespace-nowrap">
                      {SESSION_TYPE_LABELS[doc.sessionType]}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Activities */}
        {upcomingActivities.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Proximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingActivities.map((activity: any) => (
                  <Link
                    key={activity.id}
                    to={`/actividades/${activity.id}`}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.member?.name} &middot;{" "}
                        {formatDate(activity.date)}
                        {activity.location && ` · ${activity.location}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {ACTIVITY_TYPE_LABELS[activity.type]}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
