import { useState } from "react";
import { Link } from "react-router";
import { Search, Phone, Mail, Plus, UserCircle } from "lucide-react";
import { useMembers } from "@/api/hooks";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-violet-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-teal-500",
];

function colorForName(name: string) {
  let hash = 0;
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function MiembrosPage() {
  const [search, setSearch] = useState("");
  const { isAdmin } = useAuth();
  const { data, isLoading } = useMembers({ limit: "200", active: "true" });

  const members = (data?.members || data || []) as any[];
  const filtered = search
    ? members.filter(
        (m: any) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          <p className="text-muted-foreground">
            {members.length} miembro{members.length !== 1 ? "s" : ""} activo
            {members.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/usuarios/nuevo">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
          </Link>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar miembro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {search ? "No se encontraron miembros." : "No hay miembros registrados."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((member: any) => (
            <Link
              key={member.id}
              to={`/miembros/${member.id}`}
              className="group block rounded-xl border bg-card p-5 hover:bg-muted/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`${colorForName(member.name)} h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0`}
                >
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {member.name}
                    </h3>
                    <Badge
                      variant={member.role === "ADMIN" ? "default" : "secondary"}
                      className="text-[10px] shrink-0"
                    >
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <Mail className="h-3 w-3 shrink-0" />
                      {member.email}
                    </p>
                    {member.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        {member.phone}
                      </p>
                    )}
                  </div>
                  {member.bio && (
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {member.bio}
                    </p>
                  )}
                  {(member.activitiesCount ?? 0) > 0 && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                      {member.activitiesCount} actividad{member.activitiesCount !== 1 ? "es" : ""}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
