import { Link } from "react-router";
import { Users, CalendarDays, FileText, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { ACTIVITY_TYPE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/ui/status-badge";

function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-12" />
      </CardContent>
    </Card>
  );
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { data, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel Principal</h1>
          <Skeleton className="h-4 w-48 mt-1" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 min-w-0">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid gap-6 lg:grid-cols-2 min-w-0">
          <Card>
            <CardHeader><CardTitle className="text-lg">Eventos Recientes</CardTitle></CardHeader>
            <CardContent><ListSkeleton /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg">Documentos Recientes</CardTitle></CardHeader>
            <CardContent><ListSkeleton rows={3} /></CardContent>
          </Card>
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
        <Link to={isAdmin ? "/admin/usuarios" : "/miembros"}>
          <Card className="h-full transition-all hover:bg-muted/50 hover:shadow-sm cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMembers}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/actividades">
          <Card className="h-full transition-all hover:bg-muted/50 hover:shadow-sm cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Eventos del Mes</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activitiesThisMonth}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/documentos">
          <Card className="h-full transition-all hover:bg-muted/50 hover:shadow-sm cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalDocuments}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/actividades">
          <Card className="h-full transition-all hover:bg-muted/50 hover:shadow-sm cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Proximos Eventos</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingActivities.length}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2 min-w-0 overflow-hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eventos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay eventos registrados.</p>
            ) : (
              <div className="space-y-1">
                {recentActivities.map((activity: any) => (
                  <Link
                    key={activity.id}
                    to={`/actividades/${activity.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.ownerName} &middot; {formatDate(activity.startDate)}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Badge variant="secondary" className="text-xs">
                        {ACTIVITY_TYPE_LABELS[activity.type]}
                      </Badge>
                      <StatusBadge status={activity.status} className="text-xs" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Documentos Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay documentos subidos.</p>
            ) : (
              <div className="space-y-1">
                {recentDocuments.map((doc: any) => (
                  <Link
                    key={doc.id}
                    to={`/documentos/${doc.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {doc.uploaderName} &middot; {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {upcomingActivities.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Proximos Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {upcomingActivities.map((activity: any) => (
                  <Link
                    key={activity.id}
                    to={`/actividades/${activity.id}`}
                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.ownerName} &middot; {formatDate(activity.startDate)}
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
