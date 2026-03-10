import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Menu, Shield, Plus, Trash2, MessageSquare, ChevronDown, ChevronRight } from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname}:4000/api`;
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, ADMIN_NAV_ITEMS } from "@/lib/constants";
import { useConversations, useDeleteConversation } from "@/api/hooks";
import type { ConversationSummary } from "@/types/chat";

interface MobileNavProps {
  userRole: string;
}

function groupByDate(conversations: ConversationSummary[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const lastWeek = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Anteriores", items: [] },
  ];

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt);
    if (date >= today) groups[0].items.push(conv);
    else if (date >= yesterday) groups[1].items.push(conv);
    else if (date >= lastWeek) groups[2].items.push(conv);
    else groups[3].items.push(conv);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function MobileNav({ userRole }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { data: conversations = [] } = useConversations();
  const deleteConversation = useDeleteConversation();

  const groups = useMemo(() => groupByDate(conversations), [conversations]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const mainNavItems = NAV_ITEMS.filter((item) => item.href !== "/busqueda");

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <SheetTitle className="sr-only">Navegación</SheetTitle>
        <div className="flex items-center h-16 px-6 border-b shrink-0">
          {logoError ? (
            <Shield className="h-6 w-6 shrink-0 text-primary mr-2" />
          ) : (
            <img
              src={`${API_BASE}/admin/logo`}
              alt="Logo"
              className="h-6 w-6 shrink-0 object-contain mr-2"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="font-semibold text-sm leading-tight truncate">{APP_NAME}</span>
        </div>

        {/* Main nav */}
        <div className="px-3 pt-4 space-y-1 shrink-0">
          {mainNavItems.map((item) => {
            const hasChildren = "children" in item && item.children;
            const parentActive = isActive(item.href);
            return (
              <div key={item.href}>
                <Link
                  to={hasChildren ? item.children![0].href : item.href}
                  onClick={() => !hasChildren && setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    parentActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/70 hover:bg-accent"
                  )}
                >
                  <span className="flex-1">{item.label}</span>
                  {hasChildren && (
                    parentActive
                      ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                      : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  )}
                </Link>
                {hasChildren && parentActive && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l pl-3">
                    {item.children!.map((child) => {
                      const childActive = child.href === "/actividades"
                        ? pathname === "/actividades"
                        : pathname.startsWith(child.href);
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block rounded-md px-3 py-1.5 text-sm transition-colors",
                            childActive
                              ? "font-medium bg-accent"
                              : "text-foreground/60 hover:text-foreground hover:bg-accent/50"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Consulta IA + conversations */}
        <div className="flex flex-col mt-1 min-h-0 flex-1">
          <div className="px-3 shrink-0">
            <div className="flex items-center">
              <Link
                to="/busqueda"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive("/busqueda")
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-accent"
                )}
              >
                Consulta IA
              </Link>
              <button
                onClick={() => {
                  navigate("/busqueda/nueva");
                  setOpen(false);
                }}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Nueva conversación"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pt-1 pb-2">
            {groups.map((group) => (
              <div key={group.label} className="mt-2 first:mt-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-0.5">
                  {group.label}
                </p>
                {group.items.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      navigate(`/busqueda/${conv.id}`);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 text-left rounded-md pl-6 pr-2 py-1.5 text-xs group transition-colors",
                      pathname === `/busqueda/${conv.id}`
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/60 hover:bg-accent/50"
                    )}
                  >
                    <MessageSquare className="h-3 w-3 shrink-0" />
                    <span className="truncate flex-1">{conv.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation.mutate(conv.id, {
                          onSuccess: () => {
                            if (pathname === `/busqueda/${conv.id}`) {
                              navigate("/busqueda");
                            }
                          },
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.stopPropagation();
                          deleteConversation.mutate(conv.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Admin section */}
        {userRole === "ADMIN" && (
          <div className="px-3 py-4 space-y-1 border-t shrink-0">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-1">
              Administración
            </p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-accent"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
