import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { Pencil, UserPlus, X, UsersRound, Mail, Trash2, User, UserCheck, Contact } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  useGroup, useUpdateGroup, useDeleteGroup,
  useAddGroupMember, useRemoveGroupMember, useMembers,
  useSocios, useContacts,
} from "@/api/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
  "bg-violet-500", "bg-cyan-500", "bg-orange-500", "bg-teal-500",
];

function colorForName(name: string) {
  let hash = 0;
  for (const c of name) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  USER: { label: "Usuario", color: "bg-blue-500", icon: User },
  SOCIO: { label: "Socio", color: "bg-emerald-500", icon: UserCheck },
  CONTACT: { label: "Colaborador", color: "bg-orange-500", icon: Contact },
};

export function GrupoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: group, isLoading } = useGroup(id!);
  const addMember = useAddGroupMember(id!);
  const removeMember = useRemoveGroupMember(id!);
  const updateGroup = useUpdateGroup(id!);
  const deleteGroup = useDeleteGroup();

  const [showAddMember, setShowAddMember] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  if (isLoading || !group) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isLoading ? "Cargando..." : "Grupo no encontrado"}
        </h1>
      </div>
    );
  }

  const members = group.members || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10">
              <UsersRound className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
          </div>
          {group.description && (
            <p className="text-muted-foreground">{group.description}</p>
          )}
          <Badge variant="secondary">
            {members.length} miembro{members.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm"
              onClick={() => { setEditName(group.name); setEditDesc(group.description || ""); setShowEdit(true); }}>
              <Pencil className="mr-1.5 h-4 w-4" />Editar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive"
              onClick={() => setShowDelete(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />Eliminar
            </Button>
          </div>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Miembros del grupo</CardTitle>
          {isAdmin && (
            <Button size="sm" variant="ghost" className="text-primary" onClick={() => setShowAddMember(true)}>
              <UserPlus className="mr-1 h-3.5 w-3.5" />Añadir
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este grupo no tiene miembros todavía.</p>
          ) : (
            <div className="space-y-1">
              {members.map((member: any) => {
                const config = TYPE_CONFIG[member.memberType] || TYPE_CONFIG.USER;
                return (
                  <div key={`${member.memberType}-${member.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`${colorForName(member.name)} h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0`}>
                        {getInitials(member.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                        </div>
                        {member.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" />{member.email}
                          </p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => removeMember.mutate(member.id, {
                          onSuccess: () => toast.success("Miembro eliminado del grupo"),
                          onError: () => toast.error("Error al eliminar"),
                        })}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        existingMembers={members}
        onAdd={(memberId, memberType) =>
          addMember.mutate({ memberId, memberType } as any, {
            onSuccess: () => { toast.success("Miembro añadido al grupo"); setShowAddMember(false); },
            onError: (err: any) => toast.error(err?.message || "Error"),
          })
        }
      />

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(v) => !v && setShowEdit(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar grupo</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre *</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descripción</Label><Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button disabled={!editName.trim() || updateGroup.isPending}
              onClick={() => updateGroup.mutate({ name: editName.trim(), description: editDesc.trim() || undefined }, {
                onSuccess: () => { toast.success("Grupo actualizado"); setShowEdit(false); },
                onError: () => toast.error("Error al actualizar"),
              })}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDelete} onOpenChange={(v) => !v && setShowDelete(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar grupo</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">¿Estás seguro? Los miembros no serán eliminados del sistema.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={deleteGroup.isPending}
              onClick={() => deleteGroup.mutate(id!, {
                onSuccess: () => { toast.success("Grupo eliminado"); navigate("/grupos"); },
                onError: () => toast.error("Error al eliminar"),
              })}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddMemberDialog({
  open, onClose, existingMembers, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  existingMembers: any[];
  onAdd: (memberId: string, memberType: string) => void;
}) {
  const [tab, setTab] = useState<"USER" | "SOCIO" | "CONTACT">("USER");
  const [search, setSearch] = useState("");

  const { data: usersData } = useMembers({ active: "true", limit: "200" });
  const { data: sociosData } = useSocios({ estado: "ACTIVO" });
  const { data: contactsData } = useContacts({ limit: "200" });

  const users = (usersData?.members || usersData || []) as any[];
  const socios = (sociosData?.socios || []) as any[];
  const contacts = (contactsData?.contacts || contactsData || []) as any[];

  const existingIds = new Set(existingMembers.map((m: any) => `${m.memberType}-${m.id}`));

  const items = tab === "USER"
    ? users.filter(u => !existingIds.has(`USER-${u.id}`) && u.name.toLowerCase().includes(search.toLowerCase()))
        .map(u => ({ id: u.id, name: u.name, email: u.email }))
    : tab === "SOCIO"
    ? socios.filter(s => !existingIds.has(`SOCIO-${s.id}`) && [s.nombre, s.apellidos].join(" ").toLowerCase().includes(search.toLowerCase()))
        .map(s => ({ id: s.id, name: [s.nombre, s.apellidos].filter(Boolean).join(" "), email: s.email }))
    : contacts.filter(c => !existingIds.has(`CONTACT-${c.id}`) && c.name.toLowerCase().includes(search.toLowerCase()))
        .map(c => ({ id: c.id, name: c.name, email: c.email }));

  const tabs = [
    { key: "USER" as const, label: "Usuarios", icon: User },
    { key: "SOCIO" as const, label: "Socios", icon: UserCheck },
    { key: "CONTACT" as const, label: "Colaboradores", icon: Contact },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Añadir miembro al grupo</DialogTitle></DialogHeader>

        <div className="flex gap-1 rounded-lg border p-1">
          {tabs.map(t => (
            <button key={t.key} type="button"
              className={cn("flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors font-medium",
                tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
              onClick={() => { setTab(t.key); setSearch(""); }}>
              <t.icon className="h-3.5 w-3.5" />{t.label}
            </button>
          ))}
        </div>

        <Input
          placeholder={`Buscar ${tab === "USER" ? "usuario" : tab === "SOCIO" ? "socio" : "colaborador"}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="max-h-60 overflow-y-auto space-y-1">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No hay resultados</p>
          ) : (
            items.map((item) => (
              <button key={item.id} type="button"
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted text-left transition-colors"
                onClick={() => onAdd(item.id, tab)}>
                <div className={`${colorForName(item.name)} h-8 w-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
                  {getInitials(item.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.email && <p className="text-xs text-muted-foreground truncate">{item.email}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
