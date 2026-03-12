import { Clock, Loader, CircleCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_STATUS_CONFIG } from "@/lib/constants";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Clock,
  Loader,
  CircleCheck,
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  const config = ACTIVITY_STATUS_CONFIG[status];
  if (!config) return null;

  const Icon = iconMap[config.icon];

  return (
    <Badge variant="outline" className={`${config.color} ${className}`}>
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  );
}
