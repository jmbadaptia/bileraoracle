import { useAiUsage } from "@/api/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, MessageSquare, Search, FileText, Type, User } from "lucide-react";
import { cn } from "@/lib/utils";

const USD_TO_EUR = 0.92;

const CALL_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bot; color: string; bg: string }> = {
  CHAT: { label: "Chat", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
  EMBEDDING: { label: "Embeddings", icon: Search, color: "text-violet-600", bg: "bg-violet-50" },
  SUMMARY: { label: "Resúmenes", icon: FileText, color: "text-emerald-600", bg: "bg-emerald-50" },
  TITLE: { label: "Títulos", icon: Type, color: "text-amber-600", bg: "bg-amber-50" },
};

function fmt(usd: number): string {
  return (usd * USD_TO_EUR).toFixed(4);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">
          {fmt(value)}€
          <span className="text-muted-foreground font-normal"> / {fmt(max)}€</span>
        </span>
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

export function AiUsagePage() {
  const { data, isLoading } = useAiUsage();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Costes de IA</h1>
          <p className="text-muted-foreground">Uso y costes de inteligencia artificial de tu organización</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2.5 w-full rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.totalCalls === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Costes de IA</h1>
          <p className="text-muted-foreground">Uso y costes de inteligencia artificial de tu organización</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Bot className="h-6 w-6 opacity-50" />
              </div>
              <p>Sin datos de uso de IA este mes</p>
              <p className="text-sm mt-1">Los costes aparecerán cuando se use el chat o la búsqueda inteligente</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Costes de IA</h1>
        <p className="text-muted-foreground">
          Uso del mes de {data.monthKey} — {data.totalCalls} llamadas
        </p>
      </div>

      {/* Coste total con barra de progreso */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">Coste mensual</span>
          </div>
          <ProgressBar value={data.totalCost} max={data.limit} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Desglose por tipo */}
        {data.byType?.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Por tipo</p>
              <div className="space-y-3">
                {data.byType.map((t: any) => {
                  const config = CALL_TYPE_CONFIG[t.callType] || { label: t.callType, icon: Bot, color: "text-muted-foreground", bg: "bg-muted" };
                  const Icon = config.icon;
                  return (
                    <div key={t.callType} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", config.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        </div>
                        <span>{config.label}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {t.calls} — <span className="font-medium text-foreground">{fmt(t.cost)}€</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desglose por usuario */}
        {data.byUser?.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm font-medium mb-4">Por usuario</p>
              <div className="space-y-3">
                {data.byUser.map((u: any, i: number) => {
                  const colors = ["bg-blue-50 text-blue-600", "bg-emerald-50 text-emerald-600", "bg-violet-50 text-violet-600", "bg-amber-50 text-amber-600", "bg-rose-50 text-rose-600"];
                  const colorClass = colors[i % colors.length];
                  return (
                    <div key={u.userId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5">
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center", colorClass)}>
                          <User className="h-3.5 w-3.5" />
                        </div>
                        <span>{u.userName}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {u.calls} — <span className="font-medium text-foreground">{fmt(u.cost)}€</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
