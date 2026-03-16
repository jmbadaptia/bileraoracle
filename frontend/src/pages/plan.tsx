import { usePlanUsage } from "@/api/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarDays, FileText, Building2, HardDrive, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

const RESOURCES = [
  { key: "members", label: "Miembros", icon: Users },
  { key: "activities", label: "Actividades", icon: CalendarDays },
  { key: "documents", label: "Documentos", icon: FileText },
  { key: "spaces", label: "Espacios", icon: Building2 },
  { key: "storageMb", label: "Almacenamiento (MB)", icon: HardDrive },
];

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{value} <span className="text-muted-foreground font-normal">/ {max}</span></span>
        <span className={cn("text-xs font-medium", pct >= 90 ? "text-destructive" : pct >= 70 ? "text-amber-600" : "text-muted-foreground")}>
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function PlanPage() {
  const { data, isLoading } = usePlanUsage();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tu plan</h1>
          <p className="text-muted-foreground">Uso actual y límites de tu organización</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { plan, usage, limits } = data || { plan: "FREE", usage: {}, limits: {} };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tu plan</h1>
          <p className="text-muted-foreground">Uso actual y límites de tu organización</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-sm px-3 py-1">
          <Crown className="h-3.5 w-3.5" />
          Plan {plan}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {RESOURCES.map(({ key, label, icon: Icon }) => {
          const used = (usage as any)[key] || 0;
          const limit = (limits as any)[key] || 0;
          return (
            <Card key={key}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <ProgressBar value={used} max={limit} />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
