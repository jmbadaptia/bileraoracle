import { Search, X, Filter } from "lucide-react";
import { useMembers } from "@/api/hooks";
import { ACTIVITY_TYPE_LABELS, ACTIVITY_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityFilters } from "./use-activity-filters";

export function FilterBar({ filters }: { filters: ActivityFilters }) {
  const { data: membersData } = useMembers({ limit: "200", active: "true" });
  const members: any[] = membersData?.members || membersData || [];

  // For single-type select, use the first type from the set
  const selectedType = filters.types.size === 1 ? [...filters.types][0] : "";

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          value={filters.search}
          onChange={(e) => filters.setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Type dropdown */}
      <Select
        value={selectedType || "_all"}
        onValueChange={(v) => {
          // Clear all types first, then set new one (or clear if _all)
          if (v === "_all") {
            // Remove all types
            for (const t of filters.types) filters.toggleType(t);
          } else {
            // Clear existing, set new
            for (const t of filters.types) filters.toggleType(t);
            filters.toggleType(v);
          }
        }}
      >
        <SelectTrigger className="w-[140px] h-9">
          <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos los tipos</SelectItem>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status dropdown */}
      <Select
        value={filters.status || "_all"}
        onValueChange={(v) => filters.setStatus(v === "_all" ? null : v)}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all">Todos</SelectItem>
          {Object.entries(ACTIVITY_STATUS_LABELS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Participant dropdown */}
      {members.length > 0 && (
        <Select
          value={filters.participantId || "_all"}
          onValueChange={(v) => filters.setParticipantId(v === "_all" ? null : v)}
        >
          <SelectTrigger className="w-[160px] h-9">
            <SelectValue placeholder="Persona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Todas</SelectItem>
            {members.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear filters */}
      {filters.hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-muted-foreground hover:text-destructive"
          onClick={filters.clearAll}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
